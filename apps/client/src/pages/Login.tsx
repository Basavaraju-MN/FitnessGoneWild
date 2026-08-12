import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = () => {
    // Temporary login for UI development
    localStorage.setItem('isAuthenticated', 'true');

    const from =
      (location.state as { from?: string })?.from || '/';

    navigate(from);
  };

  return (
    <div className="login-page">

      <div className="login-container">

        <div className="login-card">

          <div className="login-logo">
            <img
              src="/assets/logo-mark.png"
              alt="The Fitness Gone Wild"
            />
          </div>

          <p className="login-eyebrow">
            Welcome back
          </p>

          <h1>
            Continue your
            <br />
            adventure
          </h1>

          <p className="login-description">
            Sign in to download brochures, contact us on
            WhatsApp and book your next adventure.
          </p>

          <button
            type="button"
            className="google-login-button"
            onClick={handleGoogleLogin}
          >
            <span className="google-icon">
              G
            </span>

            <span>
              Continue with Google
            </span>
          </button>

          <div className="login-divider">
            <span>Secure login</span>
          </div>

          <p className="login-footer">
            By continuing, you agree to our Terms of Service
            and Privacy Policy.
          </p>

          <button
            type="button"
            className="back-button"
            onClick={() => navigate(-1)}
          >
            ← Back to website
          </button>

        </div>

      </div>

    </div>
  );
};

export default Login;