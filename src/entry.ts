if (window.location.pathname.startsWith("/investigation/")) {
  void import("./investigation-entry");
} else {
  void import("./main");
}
