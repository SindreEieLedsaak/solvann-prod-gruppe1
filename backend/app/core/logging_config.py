import logging
import sys

from .config import settings


def setup_logging(app) -> None:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    app.logger.handlers.clear()
    app.logger.addHandler(handler)
    app.logger.setLevel(log_level)

    # Apply to root logger so third-party lib logs also use our format
    logging.basicConfig(level=log_level, handlers=[handler], force=True)
