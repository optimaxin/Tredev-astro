"""structlog configuration.

Emits one JSON line per log event. Call :func:`configure_logging` once at
process startup. All modules use :func:`get_logger` to obtain a logger.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog


def configure_logging(*, level: str = "INFO", json: bool = True) -> None:
    """Configure structlog + stdlib logging.

    Args:
        level: Root log level; library loggers inherit this.
        json: Emit JSON (prod). Set ``False`` for human-friendly console output.
    """
    log_level = logging.getLevelNamesMapping().get(level.upper(), logging.INFO)

    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)
    root.addHandler(handler)
    root.setLevel(log_level)

    processors: list[structlog.typing.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]
    if json:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> Any:
    """Return a structlog bound logger, optionally tagged with a module name."""
    log = structlog.get_logger()
    if name is not None:
        log = log.bind(logger=name)
    return log
