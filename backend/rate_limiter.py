"""Simple in-memory sliding window rate limiter."""

import time
import threading
from collections import defaultdict
from typing import Tuple

from config import RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS


class RateLimiter:
    """Thread-safe sliding window rate limiter keyed by client IP."""

    def __init__(self, max_requests: int = RATE_LIMIT_REQUESTS, window_seconds: int = RATE_LIMIT_WINDOW_SECONDS):
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """
        Check if the client is within rate limits.
        Returns (allowed: bool, remaining: int).
        """
        now = time.time()
        window_start = now - self._window_seconds

        with self._lock:
            # Remove expired timestamps
            self._requests[client_ip] = [
                ts for ts in self._requests[client_ip] if ts > window_start
            ]

            current_count = len(self._requests[client_ip])
            if current_count >= self._max_requests:
                return False, 0

            self._requests[client_ip].append(now)
            return True, self._max_requests - current_count - 1

    def reset(self) -> None:
        """Clear all tracked requests (useful for testing)."""
        with self._lock:
            self._requests.clear()


# Singleton instance
rate_limiter = RateLimiter()
