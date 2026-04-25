import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['CSE', 'AIML', 'AIDS', 'ECE', 'ME', 'CE', 'EEE', 'IT', 'BioTech'];

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'student',
    year: '', department: '', interestInput: '', interests: [],
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addInterest = () => {
    const tag = form.interestInput.toLowerCase().trim();
    if (tag && !form.interests.includes(tag)) {
      setForm(prev => ({ ...prev, interests: [...prev.interests, tag], interestInput: '' }));
    }
  };

  const removeInterest = (tag) => {
    setForm(prev => ({ ...prev, interests: prev.interests.filter(i => i !== tag) }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addInterest(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: form.name, email: form.email, password: form.password, role: form.role,
        year: form.role === 'student' ? parseInt(form.year) : undefined,
        department: form.role === 'student' ? form.department : undefined,
        interests: form.interests,
      };
      const user = await register(data);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-in" style={{ maxWidth: '520px' }}>
        <div className="auth-header">
          <div className="auth-logo">📡</div>
          <h1>Create Account</h1>
          <p>Join SmartCast broadcasting network</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input id="reg-name" className="form-input" name="name" placeholder="Your full name" value={form.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input id="reg-email" type="email" className="form-input" name="email" placeholder="you@university.edu" value={form.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input id="reg-password" type="password" className="form-input" name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select id="reg-role" className="form-select" name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'student' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select id="reg-year" className="form-select" name="year" value={form.year} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select id="reg-dept" className="form-select" name="department" value={form.department} onChange={handleChange} required>
                    <option value="">Select</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Interests</label>
                <div className="interests-input-wrap">
                  <input className="form-input" name="interestInput" placeholder="Type & press Enter" value={form.interestInput} onChange={handleChange} onKeyDown={handleKeyDown} />
                  <button type="button" className="btn btn-ghost" onClick={addInterest}>Add</button>
                </div>
                {form.interests.length > 0 && (
                  <div className="tags-container">
                    {form.interests.map(tag => (
                      <span key={tag} className="tag">
                        {tag}
                        <button type="button" onClick={() => removeInterest(tag)}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <button id="reg-submit" type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><span className="spinner"></span> Creating...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
