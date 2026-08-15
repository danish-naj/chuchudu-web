import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      setInfoMessage('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setInfoMessage('');
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first to reset password.');
      return;
    }
    try {
      setError('');
      setIsResetting(true);
      await resetPassword(email);
      setInfoMessage('Password reset link sent to your email!');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="dotted-bg min-h-screen flex flex-col items-center justify-center p-4 selection:bg-primary-container selection:text-on-primary-container">
      <div className="w-full max-w-[520px] bg-surface-container-lowest border-[3px] border-[#1a1c1c] brutal-shadow-lg p-8 md:p-10 relative">
        
        {/* Logo Badge */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <div className="inline-block bg-primary-container text-on-primary-container font-headline-md text-headline-md px-4 py-1 border-[3px] border-[#1a1c1c] brutal-shadow transform hover:-translate-y-1 transition-transform duration-200 cursor-pointer -rotate-2">
              Chuchudu
            </div>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="font-headline-lg text-headline-lg text-on-background uppercase mb-2 tracking-tighter">
            LOG IN TO PORTAL
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Access the secure upload gateway
          </p>
        </div>

        {error && (
          <div className="mb-6 border-[3px] border-error bg-error-container p-3 text-on-error-container font-label-caps text-xs font-bold text-center">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 border-[3px] border-primary bg-primary-container p-3 text-on-primary-container font-label-caps text-xs font-bold text-center">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-label-caps text-label-caps text-on-background uppercase" htmlFor="email">
              Email Address
            </label>
            <input 
              className="w-full bg-surface-container-lowest border-[3px] border-[#1a1c1c] font-inter text-[16px] text-on-background px-4 py-3 focus:outline-none focus:ring-0 focus:border-on-background focus:shadow-[4px_4px_0px_0px_#a4c639] transition-all placeholder:text-outline rounded-none" 
              id="email" 
              name="email" 
              placeholder="name@domain.com" 
              required 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2 relative">
            <div className="flex justify-between items-center">
              <label className="block font-label-caps text-label-caps text-on-background uppercase" htmlFor="password">
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResetting}
                className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-background hover:font-bold hover:underline uppercase transition-all"
              >
                {isResetting ? 'Sending...' : 'Forgot?'}
              </button>
            </div>
            <div className="relative">
              <input 
                className="w-full bg-surface-container-lowest border-[3px] border-[#1a1c1c] font-inter text-[16px] text-on-background px-4 py-3 pr-12 focus:outline-none focus:ring-0 focus:border-on-background focus:shadow-[4px_4px_0px_0px_#a4c639] transition-all placeholder:text-outline rounded-none" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-background hover:text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button 
            className="w-full bg-primary-container text-on-primary-container font-button-text text-button-text border-[3px] border-[#1a1c1c] py-4 uppercase tracking-widest brutal-shadow brutal-shadow-active hover:translate-x-[2px] hover:translate-y-[2px] transition-all mt-4 font-bold cursor-pointer" 
            type="submit"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-[2px] flex-grow bg-on-background"></div>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">or continue with</span>
          <div className="h-[2px] flex-grow bg-on-background"></div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <button 
            onClick={handleGoogleSignIn}
            type="button"
            className="w-full h-12 bg-surface-container-lowest border-[3px] border-[#1a1c1c] brutal-shadow brutal-shadow-active hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg fill="none" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.81 15.73 17.58V20.34H19.29C21.37 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"></path>
              <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.73 17.58C14.74 18.24 13.48 18.65 12 18.65C9.13 18.65 6.71 16.71 5.84 14.12H2.17V16.97C3.99 20.58 7.7 23 12 23Z" fill="#34A853"></path>
              <path d="M5.84 14.12C5.62 13.46 5.49 12.74 5.49 12C5.49 11.26 5.62 10.54 5.84 9.88V7.03H2.17C1.42 8.52 1 10.21 1 12C1 13.79 1.42 15.48 2.17 16.97L5.84 14.12Z" fill="#FBBC05"></path>
              <path d="M12 5.35C13.62 5.35 15.07 5.91 16.21 7.01L19.38 3.84C17.45 2.05 14.97 1 12 1C7.7 1 3.99 3.42 2.17 7.03L5.84 9.88C6.71 7.29 9.13 5.35 12 5.35Z" fill="#EA4335"></path>
            </svg>
            <span className="font-button-text text-[16px] uppercase text-on-surface">Google</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t-[3px] border-[#1a1c1c] text-center flex flex-col gap-4">
          <p className="font-body-md text-body-md text-on-background">
            Don't have an account?{' '}
            <Link className="font-bold underline decoration-2 underline-offset-4 hover:text-primary transition-colors px-1" to="/signup">
              Create Account
            </Link>
          </p>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wide opacity-80 max-w-[80%] mx-auto leading-relaxed text-[11px]">
            By signing in, you acknowledge our{' '}
            <Link className="font-bold underline decoration-2 underline-offset-4 hover:text-primary transition-colors px-1" to="/terms">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link className="underline hover:text-on-background" to="/privacy">
              Privacy Policy
            </Link>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
