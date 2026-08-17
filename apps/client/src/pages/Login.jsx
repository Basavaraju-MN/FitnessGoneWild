import { useLocation, useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../api/auth';
import '../styles/login.css';
import { useEffect, useRef, useState } from 'react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const googleButtonRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let interval;

    const initializeGoogle = () => {
      if (
        !window.google ||
        !googleButtonRef.current
      ) {
        return false;
      }

      const clientId =
        import.meta.env.VITE_GOOGLE_CLIENT_ID;

      console.log(
        'Google Client ID:',
        clientId
      );

      if (!clientId) {
        setError(
          'Google Client ID is not configured.'
        );

        console.error(
          'VITE_GOOGLE_CLIENT_ID is missing.'
        );

        return true;
      }

      /*
       * Clear anything already rendered.
       * This is useful during React development/StrictMode.
       */
      googleButtonRef.current.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: clientId,

        callback: async (response) => {
          try {
            setLoading(true);
            setError('');

            console.log(
              'Google credential received'
            );

            console.log(
              'Credential:',
              response.credential
            );

            const result =
              await loginWithGoogle(
                response.credential
              );

            console.log(
              'Google login successful:',
              result
            );

            localStorage.setItem(
              'isAuthenticated',
              'true'
            );

            const from =
              location.state?.from || '/';

            navigate(from);
          } catch (error) {
            console.error(
              'Google login failed:',
              error
            );

            setError(
              'Google login failed. Please try again.'
            );
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
        }
      );

      return true;
    };

    /*
     * Try immediately.
     */
    if (initializeGoogle()) {
      return;
    }

    /*
     * Google script may still be loading.
     * Check until it becomes available.
     */
    interval = setInterval(() => {
      if (initializeGoogle()) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [location, navigate]);

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
            Sign in to download brochures, contact us
            on WhatsApp and book your next adventure.
          </p>

          {error && (
            <p
              style={{
                color: 'red',
                marginBottom: '15px',
              }}
            >
              {error}
            </p>
          )}

          {loading ? (
            <p>
              Signing you in...
            </p>
          ) : (
            <div
              ref={googleButtonRef}
            />
          )}

          <div className="login-divider">
            <span>
              Secure login
            </span>
          </div>

          <p className="login-footer">
            By continuing, you agree to our Terms of
            Service and Privacy Policy.
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