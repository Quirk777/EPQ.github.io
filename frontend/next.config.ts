/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const isProd = process.env.NODE_ENV === "production";
    const apiUrl =
      process.env.BACKEND_URL ||
      (isProd ? "http://backend:8001" : "http://127.0.0.1:8001");
    
    return [
      // Applicant flow
      {
        source: "/api/applicant/:aid/questions",
        destination: `${apiUrl}/applicant/:aid/questions`,
      },
      {
        source: "/api/applicant/:aid/submit",
        destination: `${apiUrl}/applicant/:aid/submit`,
      },

      // Employer branding API (backend has /api prefix)
      {
        source: "/api/employer/branding",
        destination: `${apiUrl}/api/employer/branding`,
      },
      {
        source: "/api/employer/branding/asset/:path*",
        destination: `${apiUrl}/api/employer/branding/asset/:path*`,
      },
      {
        source: "/api/employer/branding/:path*",
        destination: `${apiUrl}/api/employer/branding/:path*`,
      },

      // Employer roles API (backend has /api prefix)
      {
        source: "/api/employer/roles/:path*",
        destination: `${apiUrl}/api/employer/roles/:path*`,
      },

      // Other employer API routes (backend has NO /api prefix)
      {
        source: "/api/employer/:path*",
        destination: `${apiUrl}/employer/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
