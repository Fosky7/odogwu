import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

type RouteMetaTag = {
  title?: string;
  name?: string;
  property?: string;
  httpEquiv?: string;
  charSet?: string;
  content?: string;
};

type RouteHeadProps = {
  fallbackTitle?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
};

const ROUTE_META_ATTR = "data-kross-route-meta";

/**
 * Apply the deepest matched route's head() metadata after client navigation.
 * Named/property tags replace static and parent defaults rather than piling up.
 * This mounts after the app layout so legacy static title effects lose to the
 * route's own declaration on the initial render as well as on later navigations.
 */
export function RouteHead({
  fallbackTitle = "",
  notFoundTitle = "Page not found",
  notFoundDescription = "The page you requested does not exist or has moved.",
}: RouteHeadProps) {
  const matches = useRouterState({ select: (state) => state.matches });
  const initialTitle = useRef(typeof document === "undefined" ? "" : document.title);

  useEffect(() => {
    if (typeof document === "undefined" || !document.head) return;

    let title = fallbackTitle || initialTitle.current;
    let titleDepth = -1;
    let descriptionDepth = -1;
    let ogTitleDepth = -1;
    let ogDescriptionDepth = -1;
    const tags = new Map<string, RouteMetaTag>();

    for (const [depth, match] of matches.entries()) {
      for (const tag of (match.meta ?? []) as Array<RouteMetaTag | undefined>) {
        if (!tag) continue;
        if (tag.title?.trim()) {
          title = tag.title;
          titleDepth = depth;
          continue;
        }
        const key = tag.name
          ? `name:${tag.name}`
          : tag.property
            ? `property:${tag.property}`
            : tag.httpEquiv
              ? `http-equiv:${tag.httpEquiv}`
              : tag.charSet
                ? "charset"
                : null;
        if (key) {
          tags.set(key, tag);
          if (key === "name:description") descriptionDepth = depth;
          if (key === "property:og:title") ogTitleDepth = depth;
          if (key === "property:og:description") ogDescriptionDepth = depth;
        }
      }
    }

    // Older pages often declare only a title. Do not reuse the root description
    // or social title on every page: derive fallbacks from that page's title.
    if (title && titleDepth > descriptionDepth) {
      tags.set("name:description", {
        name: "description",
        content: `Discover ${title}, with details, features and updates.`,
      });
    }
    if (title && titleDepth > ogTitleDepth) {
      tags.set("property:og:title", { property: "og:title", content: title });
    }
    if (title && titleDepth > ogDescriptionDepth) {
      tags.set("property:og:description", {
        property: "og:description",
        content: `Discover ${title}, with details, features and updates.`,
      });
    }

    if (matches.some((match) => match.globalNotFound)) {
      title = notFoundTitle;
      tags.set("name:description", { name: "description", content: notFoundDescription });
      tags.set("property:og:title", { property: "og:title", content: notFoundTitle });
      tags.set("property:og:description", { property: "og:description", content: notFoundDescription });
    }

    if (title) document.title = title;
    document.head.querySelectorAll(`meta[${ROUTE_META_ATTR}]`).forEach((node) => node.remove());

    for (const [key, tag] of tags) {
      // index.html and older fallback effects may have supplied the same tag.
      // The matched route is authoritative, so remove only that exact key.
      for (const existing of Array.from(document.head.querySelectorAll("meta"))) {
        if (existing.hasAttribute(ROUTE_META_ATTR)) continue;
        const existingKey = existing.getAttribute("name")
          ? `name:${existing.getAttribute("name")}`
          : existing.getAttribute("property")
            ? `property:${existing.getAttribute("property")}`
            : existing.getAttribute("http-equiv")
              ? `http-equiv:${existing.getAttribute("http-equiv")}`
              : existing.getAttribute("charset")
                ? "charset"
                : null;
        if (existingKey === key) existing.remove();
      }

      const meta = document.createElement("meta");
      meta.setAttribute(ROUTE_META_ATTR, "");
      if (tag.name) meta.setAttribute("name", tag.name);
      if (tag.property) meta.setAttribute("property", tag.property);
      if (tag.httpEquiv) meta.setAttribute("http-equiv", tag.httpEquiv);
      if (tag.charSet) meta.setAttribute("charset", tag.charSet);
      if (tag.content != null) meta.setAttribute("content", tag.content);
      document.head.appendChild(meta);
    }
  }, [matches, fallbackTitle, notFoundTitle, notFoundDescription]);

  return null;
}
