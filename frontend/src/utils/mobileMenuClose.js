import { useEffect } from "react";
import { Collapse, Dropdown } from "bootstrap";

export const MOBILE_MENU_CLOSE_EVENT = "ontract:close-mobile-menus";

function isMobileViewport() {
  return window.matchMedia("(max-width: 991.98px)").matches;
}

function closeBootstrapCollapses() {
  document.querySelectorAll(".navbar-collapse.show").forEach((element) => {
    try {
      Collapse.getOrCreateInstance(element, { toggle: false }).hide();
    } catch {
      element.classList.remove("show");
    }
  });

  document
    .querySelectorAll('[data-bs-toggle="collapse"][aria-expanded="true"]')
    .forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
}

function closeBootstrapDropdowns() {
  document.querySelectorAll(".dropdown-menu.show").forEach((menu) => {
    const labelledBy = menu.getAttribute("aria-labelledby");

    const toggle =
      (labelledBy ? document.getElementById(labelledBy) : null) ||
      menu.parentElement?.querySelector('[data-bs-toggle="dropdown"]') ||
      menu.parentElement?.querySelector(".dropdown-toggle");

    if (toggle) {
      try {
        Dropdown.getOrCreateInstance(toggle).hide();
        return;
      } catch {
        toggle.setAttribute("aria-expanded", "false");
      }
    }

    menu.classList.remove("show");
  });
}

function closeMobileMenus() {
  if (!isMobileViewport()) return;

  closeBootstrapCollapses();
  closeBootstrapDropdowns();

  document.dispatchEvent(new Event(MOBILE_MENU_CLOSE_EVENT));
}

export function useCloseMobileMenusOnScroll() {
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      // Mobile only
      if (!isMobileViewport()) return;

      const currentScrollY = window.scrollY;

      // Ignore tiny movements
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;

      lastScrollY = currentScrollY;

      closeMobileMenus();
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
}

export function useMobileMenuClose(callback) {
  useEffect(() => {
    const handleClose = () => {
      callback();
    };

    document.addEventListener(
      MOBILE_MENU_CLOSE_EVENT,
      handleClose
    );

    return () => {
      document.removeEventListener(
        MOBILE_MENU_CLOSE_EVENT,
        handleClose
      );
    };
  }, [callback]);
}