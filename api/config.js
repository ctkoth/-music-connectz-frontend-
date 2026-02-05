module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  // WARNING: This exposes a public Maps JS key to clients (acceptable when restricted by referrer).
  res.end(`window.GOOGLE_MAPS_API_KEY = "AIzaSyCrMy3b5x32jJflhmvLDjgFScV0Lweyel8";
window.GOOGLE_MAP_ID = "";`);
};
