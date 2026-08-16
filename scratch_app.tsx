import React, { useState, useEffect } from 'react';
import { Image, Dices, MicOff, Lightbulb, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';
import logoImg from './assets/logo.png';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('Role-Play Roulette');
  const [logoError, setLogoError] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  
  // New States for Supabase Integration
  const [prompts, setPrompts] = useState<any[]>([]);
  const [levelFilter, setLevelFilter] = useState('B2');
  const [ageGroupFilter, setAgeGroupFilter] = useState('Kids');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPrompt, setNewPrompt] = useState<{ file: File | null, question: string, level: string, ageGroup: string }>({ file: null, question: '', level: 'B2', ageGroup: 'Kids' });

  const handleNextPrompt = () => {
    if (prompts.length > 0) {
      setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
    }
  };

  const fetchPrompts = async () => {
    console.log('Fetching level:', levelFilter, 'ageGroup:', ageGroupFilter);
    try {
      const { data, error } = await supabase.from('visual_prompts')
        .select('*')
        .eq('level', levelFilter)
        .eq('age_group', ageGroupFilter);
      if (error) {
        console.error('Supabase fetch error:', error);
      } else {
        setPrompts(data || []);
        setCurrentPromptIndex(0);
      }
    } catch (err) {
      console.error('Unexpected error during Supabase fetch:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Visual Prompts') {
      fetchPrompts();
    }
  }, [activeTab, levelFilter, ageGroupFilter]);

  const handleSavePrompt = async () => {
    if (!newPrompt.file) {
      alert("Please select an image file first.");
      return;
    }
    
    setIsUploading(true);
    try {
      const fileExt = newPrompt.file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('prompts_images').upload(fileName, newPrompt.file);
      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        setIsUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('prompts_images').getPublicUrl(fileName);

      const { error } = await supabase.from('visual_prompts').insert([{
        image_url: publicUrl,
        question: newPrompt.question,
        level: newPrompt.level,
        age_group: newPrompt.ageGroup
      }]);
      
      if (error) {
        console.error("Supabase insert error:", error);
        setIsUploading(false);
        return;
      }
      
      setIsModalOpen(false);
      setNewPrompt({ file: null, question: '', level: 'B2', ageGroup: 'Kids' });
      fetchPrompts();
    } catch (err) {
      console.error("Unexpected error saving prompt:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      const { error } = await supabase.from('visual_prompts').delete().eq('id', id);
      if (error) {
        console.error("Supabase delete error:", error);
        return;
      }
      
      const newPrompts = prompts.filter(p => p.id !== id);
      setPrompts(newPrompts);
      
      if (newPrompts.length === 0) {
        setCurrentPromptIndex(0);
      } else if (currentPromptIndex >= newPrompts.length) {
        setCurrentPromptIndex(newPrompts.length - 1);
      }
    } catch (err) {
      console.error("Unexpected error deleting prompt:", err);
    }
  };

  const navItems = [
    { name: 'Visual Prompts', icon: <Image size={24} strokeWidth={2.5} color="#3B82F6" />, color: '#3B82F6' },
    { name: 'Role-Play Roulette', icon: <Dices size={24} strokeWidth={2.5} color="#FFD100" />, color: '#FFD100' },
    { name: 'Taboo Generator', icon: <MicOff size={24} strokeWidth={2.5} color="#EF4444" />, color: '#EF4444' },
    { name: 'Pitch Perfect', icon: <Lightbulb size={24} strokeWidth={2.5} color="#10B981" />, color: '#10B981' },
    { name: 'Action Wheel', icon: <RefreshCw size={24} strokeWidth={2.5} color="#8B5CF6" />, color: '#8B5CF6' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* LEFT SIDEBAR */}
      <aside style={{
        width: '300px',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '2.5rem 0',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0, 0, 0, 0.2)', // Slightly darker sidebar for contrast against the gradient
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ padding: '0 2rem', marginBottom: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!logoError ? (
            <img 
              src={logoImg} 
              alt="English Time Logo" 
              style={{ maxHeight: '80px', objectFit: 'contain' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.5px', margin: 0 }}>
              English<span style={{ color: '#FFD100' }}>Time</span>
            </h1>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.name;
            // Add alpha to hex color for background (approx 10% opacity)
            const bgColor = isActive ? `${item.color}1A` : 'transparent';
            
            return (
              <div 
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                style={{
                  padding: '1.25rem 2rem',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: isActive ? item.color : 'var(--color-text)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  backgroundColor: bgColor,
                  borderLeft: `4px solid ${isActive ? item.color : 'transparent'}`,
                  borderTopRightRadius: '20px',
                  borderBottomRightRadius: '20px',
                  marginRight: '1rem',
                  boxShadow: isActive ? `inset 0 0 20px ${item.color}11` : 'none',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  filter: isActive ? `drop-shadow(0 0 8px ${item.color}66)` : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  {item.icon}
                </div>
                <span style={{
                  textShadow: isActive ? `0 0 10px ${item.color}44` : 'none',
                }}>{item.name}</span>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* MAIN LAYOUT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <header style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '2rem 3rem',
        }}>
          {/* Empty left section to balance grid */}
          <div></div>
          
          {/* Center Title */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}>
              Speaking Activities
            </h2>
          </div>

          {/* Right Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                fontWeight: 500
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              ⚙️ Add Prompt
            </button>
            <select style={selectStyle} value={ageGroupFilter} onChange={(e) => setAgeGroupFilter(e.target.value)}>
              <option value="Kids">Age Group: Kids</option>
              <option value="Teens">Age Group: Teens</option>
              <option value="Adults">Age Group: Adults</option>
            </select>
            <select style={selectStyle} value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="A1">Level: A1</option>
              <option value="A2">Level: A2</option>
              <option value="B1">Level: B1</option>
              <option value="B2">Level: B2</option>
              <option value="C1">Level: C1</option>
            </select>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main style={{
          flex: 1,
          padding: '1rem 3rem 3rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {activeTab === 'Role-Play Roulette' ? (
            <div className="premium-card" style={{
              width: '100%',
              maxWidth: '900px',
              padding: '5rem 4rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '4rem'
            }}>
              <div>
                <h2 style={{ textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '1rem' }}>Situation</h2>
                <p style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4 }}>
                  At a busy coffee shop, someone takes your order by mistake.
                </p>
              </div>

              <div>
                <h2 style={{ textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--color-text-muted)', fontSize: '1.1rem', marginBottom: '1rem' }}>Your Role</h2>
                <p style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--color-primary)', lineHeight: 1.4 }}>
                  The angry customer who hasn't had their morning coffee.
                </p>
              </div>

              <button style={{
                marginTop: '2rem',
                backgroundColor: 'var(--color-primary)',
                color: '#000',
                border: 'none',
                borderRadius: '50px',
                padding: '1.25rem 6rem',
                fontSize: '1.5rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(255, 209, 0, 0.4), 0 4px 15px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 0 35px rgba(255, 209, 0, 0.6), 0 8px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 209, 0, 0.4), 0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
              >
                Spin
              </button>
            </div>
          ) : activeTab === 'Visual Prompts' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '2rem' }}>
              
              {prompts.length === 0 ? (
                <div style={{ fontSize: '2rem', fontWeight: 'bold', padding: '3rem', color: 'var(--color-text-muted)' }}>
                  0 PROMPTS FOUND
                </div>
              ) : (
                <div className="premium-card" style={{
                  width: '100%',
                  maxWidth: '900px',
                  padding: '3.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2.5rem',
                  position: 'relative'
                }}>
                  <button 
                    onClick={() => handleDelete(prompts[currentPromptIndex].id)}
                    style={{
                      position: 'absolute',
                      top: '1.5rem',
                      right: '1.5rem',
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.4)',
                      border: 'none',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      transition: 'all 0.2s ease',
                      zIndex: 10
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.color = '#EF4444';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Delete Prompt"
                  >
                    🗑️
                  </button>
                  <div style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <img 
                      src={prompts[currentPromptIndex]?.image_url} 
                      alt="Visual Prompt" 
                      style={{ width: '100%', height: '500px', objectFit: 'contain', display: 'block' }}
                    />
                  </div>
                  
                  <div style={{ textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {prompts[currentPromptIndex]?.question?.split('\n').map((line: string, i: number) => (
                      <p key={i} style={{ fontSize: '2.2rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>

                  <button style={{
                    backgroundColor: '#FFD100',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '50px',
                    padding: '1.25rem 4rem',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(255, 209, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 209, 0, 0.6), 0 6px 16px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 209, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.2)';
                  }}
                  onClick={handleNextPrompt}
                  >
                    Next Prompt
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="premium-card" style={{ padding: '3rem', textAlign: 'center', minWidth: '400px' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                {navItems.find(item => item.name === activeTab)?.icon}
              </div>
              <h2 style={{ fontSize: '2rem', color: navItems.find(item => item.name === activeTab)?.color }}>{activeTab}</h2>
              <p style={{ marginTop: '1rem' }}>Coming soon...</p>
            </div>
          )}
        </main>
      </div>

      {/* ADMIN ADD PROMPT MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="premium-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 600 }}>Add New Prompt</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Image Upload</label>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setNewPrompt({...newPrompt, file: e.target.files[0]});
                  }
                }}
                style={{ ...inputStyle, padding: '0.5rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Question</label>
              <textarea 
                value={newPrompt.question}
                onChange={e => setNewPrompt({...newPrompt, question: e.target.value})}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px', fontFamily: 'inherit' }}
                rows={4}
                placeholder="Question 1...&#10;Question 2..."
              />
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Level</label>
                <select 
                  value={newPrompt.level}
                  onChange={e => setNewPrompt({...newPrompt, level: e.target.value})}
                  style={{ ...inputStyle, cursor: 'pointer', color: 'white', appearance: 'auto' }}
                >
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <label style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Age Group</label>
                <select 
                  value={newPrompt.ageGroup}
                  onChange={e => setNewPrompt({...newPrompt, ageGroup: e.target.value})}
                  style={{ ...inputStyle, cursor: 'pointer', color: 'white', appearance: 'auto' }}
                >
                  <option value="Kids">Kids</option>
                  <option value="Teens">Teens</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ ...buttonStyle, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                Cancel
              </button>
              <button 
                onClick={handleSavePrompt} 
                disabled={isUploading}
                style={{ ...buttonStyle, background: isUploading ? '#665400' : '#FFD100', color: isUploading ? '#aaa' : '#000', border: 'none' }}
              >
                {isUploading ? 'Uploading...' : 'Save Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '0.85rem',
  color: '#FFF',
  fontSize: '1rem',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '1rem',
  transition: 'all 0.2s ease'
};

const selectStyle: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  color: 'var(--color-text)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  fontFamily: 'inherit',
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  backgroundSize: '1em',
  paddingRight: '3rem'
};

export default App;
