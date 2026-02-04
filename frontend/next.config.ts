/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Use environment variable for API URL, fallback to localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
    
    return [
      // PDF click: map your dashboard URL to the REAL backend PDF route
      {
        source: "/api/employer/pdf/:candidate_id",
        destination: `${apiUrl}/applicant/reports/by-candidate/:candidate_id`,
      },

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
