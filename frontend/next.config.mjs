const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export default {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND}/api/:path*` }];
  },
};
