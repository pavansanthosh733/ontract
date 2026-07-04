import socket
import ipaddress
import requests
from urllib.parse import urlparse


def safe_fetch(url, timeout=10):
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only HTTP/HTTPS URLs are allowed.")

    hostname = parsed.hostname

    if not hostname:
        raise ValueError("Invalid URL.")

    ip = socket.gethostbyname(hostname)
    ip_obj = ipaddress.ip_address(ip)

    if (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_reserved
        or ip_obj.is_multicast
    ):
        raise ValueError("Private or internal IP addresses are blocked.")

    return requests.get(url, timeout=timeout)