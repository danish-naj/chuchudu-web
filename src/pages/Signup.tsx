import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup: React.FC = () => {
  const { signup, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      return setError('You must agree to the Terms of Service and Privacy Policy to continue.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      setError('');
      // In a real app we might pass fullName too, depending on AuthContext implementation
      await signup(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create an account');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <main className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
        
        {/* Background Graphic Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 brutal-border opacity-20 -rotate-12 pointer-events-none hidden lg:block"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full brutal-border opacity-20 rotate-45 pointer-events-none hidden lg:block"></div>
        
        <div className="w-full max-w-[480px] bg-surface-container-lowest brutal-border brutal-shadow p-6 md:p-8 relative z-10">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-6 hover:scale-105 transition-transform duration-200">
               <div className="font-headline-lg text-headline-md tracking-tighter uppercase text-on-surface bg-primary-container px-4 py-1 brutal-border inline-block -rotate-4 transform">
                  Chuchudu
               </div>
            </Link>
            <h1 className="font-headline-lg text-[32px] md:text-headline-md uppercase mb-2">Create Account</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Get access to the secure upload portal</p>
          </div>
          
          {error && <p className="text-error mb-4 font-bold text-center">{error}</p>}
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block font-label-caps text-label-caps uppercase text-on-surface" htmlFor="fullName">Full Name</label>
              <input 
                className="w-full bg-surface-container-lowest border-2 border-on-background p-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#a4c639] focus:border-on-background transition-shadow duration-200 rounded-none" 
                id="fullName" 
                placeholder="Jane Doe" 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block font-label-caps text-label-caps uppercase text-on-surface" htmlFor="email">Email Address</label>
              <input 
                className="w-full bg-surface-container-lowest border-2 border-on-background p-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#a4c639] focus:border-on-background transition-shadow duration-200 rounded-none" 
                id="email" 
                placeholder="jane@example.com" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block font-label-caps text-label-caps uppercase text-on-surface" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-lowest border-2 border-on-background p-3 pr-12 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#a4c639] focus:border-on-background transition-shadow duration-200 rounded-none" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  aria-label="Toggle password visibility" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-label-caps text-label-caps uppercase text-on-surface" htmlFor="confirmPassword">Confirm Password</label>
              <input 
                className="w-full bg-surface-container-lowest border-2 border-on-background p-3 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#a4c639] focus:border-on-background transition-shadow duration-200 rounded-none" 
                id="confirmPassword" 
                placeholder="••••••••" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="mt-6 p-4 border-2 border-on-background flex items-start gap-3 bg-primary-container/10">
              <div className="pt-1">
                <input 
                  className="appearance-none w-6 h-6 border-2 border-on-background bg-surface-container-lowest checked:bg-primary-container checked:border-on-background rounded-none cursor-pointer flex items-center justify-center relative after:content-[''] after:hidden checked:after:block after:w-2 after:h-4 after:border-r-2 after:border-b-2 after:border-on-background after:rotate-45 after:-mt-1 transition-colors" 
                  id="terms" 
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
              </div>
              <label className="font-body-md text-body-md text-on-surface-variant leading-tight cursor-pointer" htmlFor="terms">
                  I have read and agree to the <Link to="/terms" className="text-on-surface font-bold underline decoration-2 underline-offset-2 hover:text-primary transition-colors">Terms of Service</Link> and <Link to="/privacy" className="text-on-surface font-bold underline decoration-2 underline-offset-2 hover:text-primary transition-colors">Privacy Policy</Link>. I understand I am solely responsible for any content I upload.
              </label>
            </div>
            
            <button 
              className={`w-full mt-8 border-2 border-on-background font-button-text text-button-text uppercase py-4 transition-all duration-200 
                ${agreedToTerms ? 'bg-primary-container text-on-primary-container brutal-shadow brutal-hover' : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed'}
              `}
              disabled={!agreedToTerms} 
              type="submit"
            >
              Create Account
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="h-0.5 flex-grow bg-on-background"></div>
            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">or continue with</span>
            <div className="h-0.5 flex-grow bg-on-background"></div>
          </div>
          
          <div className="mt-6 flex flex-col gap-4">
            <button 
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full h-12 bg-surface-container-lowest border-2 border-on-background brutal-shadow brutal-hover flex items-center justify-center gap-3"
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

          <div className="mt-6 text-center">
            <Link className="inline-block font-button-text text-button-text text-on-surface border-b-2 border-on-background hover:text-primary hover:border-primary transition-colors pb-1" to="/login">
              Log In Instead
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
