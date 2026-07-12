import { Link } from 'react-router-dom';

export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-5xl mb-3">🐾</p>
        <h1 className="text-xl font-semibold text-foreground mb-1">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          This page wandered off somewhere.
        </p>
        <Link to="/" className="text-blue-600 hover:underline text-sm font-medium">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
