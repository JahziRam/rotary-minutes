export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/fr" || url.pathname.startsWith("/fr/")) {
      return Response.redirect("https://rotary-minutes-landing.pages.dev", 302);
    }
    return env.ASSETS.fetch(request);
  },
};