import os

from flask import Flask
from flask_cors import CORS


from .api.health import health_bp
from .api.example import example_bp
from .api.plant_api import plant_bp
from .api.turbines_api import turbines_bp
from .api.reservoir_api import reservoir_bp
from .api.market_api import market_bp
from .api.solar_api import solar_bp
from .api.history_api import history_bp
from .core.config import settings
from .core.logging_config import setup_logging
from .core.errors import register_error_handlers


def create_app(config_override: dict | None = None) -> Flask:
    app = Flask(__name__)

    app.config["SECRET_KEY"] = settings.SECRET_KEY
    app.config["DEBUG"] = settings.DEBUG

    if config_override:
        app.config.update(config_override)

    setup_logging(app)
    CORS(app, origins=settings.CORS_ORIGINS)

    # Register blueprints — each module owns its own routes
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(example_bp, url_prefix="/api")
    app.register_blueprint(plant_bp, url_prefix="/api")
    app.register_blueprint(turbines_bp, url_prefix="/api")
    app.register_blueprint(reservoir_bp, url_prefix="/api")
    app.register_blueprint(market_bp, url_prefix="/api")
    app.register_blueprint(solar_bp, url_prefix="/api")
    app.register_blueprint(history_bp, url_prefix="/api")


    register_error_handlers(app)

    _init_history_collector(app)

    return app


def _init_history_collector(app: Flask) -> None:
    """Start a background job that samples plant data into Postgres every 60s.

    Skipped during tests, and skipped in the Werkzeug reloader's parent
    process so it doesn't run twice under `flask run`/dev `app.run(debug=True)`.
    """
    if app.config.get("TESTING") or not settings.ENABLE_HISTORY_COLLECTOR:
        return
    if app.config.get("DEBUG") and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    from .services import history_service, mock_data_service

    try:
        history_service.init_db()
    except Exception:
        app.logger.exception(
            "Could not initialize history database — history collector disabled"
        )
        return

    from apscheduler.schedulers.background import BackgroundScheduler

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        lambda: history_service.record_snapshot(mock_data_service.get_overview()),
        "interval",
        seconds=60,
        id="plant_snapshot_collector",
        replace_existing=True,
    )
    scheduler.start()
    app.logger.info("History collector started (60s interval)")
