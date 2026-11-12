// Generated route tree. The @tanstack/router-plugin rewrites this file on
// dev/build; the committed version keeps the instant preview resolvable.
import { Route as rootRoute } from "./routes/__root";
import { Route as IndexRoute } from "./routes/index";

const IndexRouteWithParent = IndexRoute.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);

export const routeTree = rootRoute.addChildren([IndexRouteWithParent] as any);
