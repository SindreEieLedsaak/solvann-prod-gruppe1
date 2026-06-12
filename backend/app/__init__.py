from flask import Flask
from flask_cors import CORS


from .api.health import health_bp
from .api.example import example_bp
from .api.plant_api import plant_bp
from .api.turbines_api import turbines_bp
from .api.reservoir_api import reservoir_bp
from .api.market_api import market_bp
from .api.solar_api import solar_bp
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

    register_error_handlers(app)

    return app
