// Configuration
const CONFIG = {
    // Maxxie006's Discord configuration for Lanyard integration
    DISCORD_USER_ID: '1421369024058490880', // Maxxie006's Discord ID
    LANYARD_API_URL: 'https://api.lanyard.rest/v1/users/1421369024058490880',
    GITHUB_USERNAME: 'Maxxie006', // GitHub username
};

// Utility functions
function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
}

function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

// Lanyard Discord Status Integration
class LanyardIntegration {
    constructor(userId) {
        this.userId = userId;
        this.container = document.getElementById('discord-status');
        this.websocket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    async init() {
        try {
            // First try REST API
            await this.fetchStatus();
            // Then establish WebSocket for real-time updates
            this.connectWebSocket();
        } catch (error) {
            console.error('Failed to initialize Lanyard:', error);
            this.showError('Discord status unavailable');
        }
    }

    async fetchStatus() {
        try {
            const response = await fetch(`${CONFIG.LANYARD_API_URL}${this.userId}`);
            if (!response.ok) throw new Error('Failed to fetch status');
            
            const data = await response.json();
            this.updateStatus(data.data);
        } catch (error) {
            console.error('Error fetching Discord status:', error);
            this.showError('Unable to load Discord status');
        }
    }

    connectWebSocket() {
        try {
            this.websocket = new WebSocket('wss://api.lanyard.rest/socket');
            
            this.websocket.onopen = () => {
                console.log('Lanyard WebSocket connected');
                this.reconnectAttempts = 0;
                // Subscribe to user updates
                this.websocket.send(JSON.stringify({
                    op: 2,
                    d: {
                        subscribe_to_id: this.userId
                    }
                }));
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
                    this.updateStatus(data.d);
                }
            };

            this.websocket.onclose = () => {
                console.log('Lanyard WebSocket disconnected');
                this.handleReconnect();
            };

            this.websocket.onerror = (error) => {
                console.error('Lanyard WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
        }
    }

    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connectWebSocket(), delay);
        }
    }

    updateStatus(data) {
        if (!data) {
            this.showError('No status data available');
            return;
        }

        // Update Discord status indicator color
        const indicator = document.getElementById('discord-indicator');
        if (indicator) {
            indicator.className = 'discord-status-indicator';
            // Force DND status for demo
            indicator.classList.add('status-dnd');
        }

        // Update profile picture if avatar is available
        const profilePicture = document.getElementById('profile-picture');
        if (profilePicture && data.discord_user.avatar) {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=256`;
            profilePicture.style.backgroundImage = `url(${avatarUrl})`;
            profilePicture.style.backgroundSize = 'cover';
            profilePicture.style.backgroundPosition = 'center';
        }

        // Create status display
        const statusContainer = createElement('div', 'discord-user');
        
        // Status text
        const statusText = createElement('p', 'discord-status-text');
        const statusLabel = this.getStatusText(data.discord_status);
        
        // Create status with colored text only for the status word
        if (data.discord_status === 'online') {
            const statusSpan = createElement('span', 'status-online-text');
            statusSpan.textContent = statusLabel.toUpperCase();
            statusText.appendChild(statusSpan);
        } else {
            statusText.textContent = statusLabel.toUpperCase();
        }
        
        // Use actual Discord status

        statusContainer.appendChild(statusText);

        // Activities (including Spotify)
        if (data.activities && data.activities.length > 0) {
            data.activities.forEach(activity => {
                if (activity.type !== 4) { // Skip custom status
                    const activityElement = this.createActivityElement(activity);
                    statusContainer.appendChild(activityElement);
                }
            });
        }

        this.container.innerHTML = '';
        this.container.appendChild(statusContainer);
    }

    createActivityElement(activity) {
        const activityDiv = createElement('div', 'activity');
        const activityName = createElement('p', 'activity-name', activity.name);
        activityDiv.appendChild(activityName);

        if (activity.details) {
            const details = createElement('p', 'activity-details', activity.details);
            activityDiv.appendChild(details);
        }

        if (activity.state) {
            const state = createElement('p', 'activity-state', activity.state);
            activityDiv.appendChild(state);
        }

        return activityDiv;
    }

    getStatusText(status) {
        const statusMap = {
            'online': 'Online',
            'idle': 'Idle',
            'dnd': 'Do Not Disturb',
            'offline': 'Offline'
        };
        return statusMap[status] || 'Unknown';
    }


    showError(message) {
        this.container.innerHTML = `<div class="error">${message}</div>`;
    }
}


// Simple Pixel effects and animations
class PixelEffects {
    constructor() {
        this.init();
    }

    init() {
        this.addHoverEffects();
        this.addParticleEffect();
        this.addClickEffects();
    }

    addHoverEffects() {
        // Add hover effect to profile picture
        const profilePicture = document.querySelector('.profile-picture');
        if (profilePicture) {
            profilePicture.addEventListener('mouseenter', () => {
                profilePicture.style.transform = 'scale(1.1)';
            });
            profilePicture.addEventListener('mouseleave', () => {
                profilePicture.style.transform = '';
            });
        }

        // Add hover effects to main section
        const mainSection = document.querySelector('.profile-main');
        if (mainSection) {
            mainSection.addEventListener('mouseenter', () => {
                mainSection.style.boxShadow = `
                    0 0 30px rgba(255, 255, 255, 0.4),
                    0 0 60px rgba(74, 158, 255, 0.3),
                    0 0 90px rgba(255, 255, 255, 0.2)
                `;
                mainSection.style.borderColor = 'rgba(74, 158, 255, 0.5)';
            });
            mainSection.addEventListener('mouseleave', () => {
                mainSection.style.boxShadow = '';
                mainSection.style.borderColor = '';
            });
        }
    }

    addParticleEffect() {
        // Dark theme particle system
        const createParticle = () => {
            const particle = document.createElement('div');
            const size = Math.random() * 3 + 1;
            const colors = ['#ffffff', '#e0e0e0', '#4a9eff', '#888888'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            particle.style.position = 'fixed';
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.backgroundColor = color;
            particle.style.opacity = Math.random() * 0.5 + 0.2;
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.top = window.innerHeight + 'px';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '1';
            particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
            particle.style.borderRadius = Math.random() > 0.7 ? '50%' : '0';
            
            document.body.appendChild(particle);

            // Simple upward animation
            const animation = particle.animate([
                { 
                    transform: 'translateY(0px)', 
                    opacity: particle.style.opacity 
                },
                { 
                    transform: `translateY(-${window.innerHeight + 100}px)`, 
                    opacity: 0 
                }
            ], {
                duration: Math.random() * 3000 + 2000,
                easing: 'linear'
            });

            animation.onfinish = () => {
                particle.remove();
            };
        };

        // Create particles less frequently for subtle effect
        setInterval(createParticle, 1200);
    }

    addClickEffects() {
        // Dark theme click burst effect
        document.addEventListener('click', (e) => {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    const burst = document.createElement('div');
                    const colors = ['#ffffff', '#4a9eff', '#e0e0e0', '#888888'];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    
                    burst.style.position = 'fixed';
                    burst.style.width = '8px';
                    burst.style.height = '8px';
                    burst.style.backgroundColor = color;
                    burst.style.left = e.clientX + 'px';
                    burst.style.top = e.clientY + 'px';
                    burst.style.pointerEvents = 'none';
                    burst.style.zIndex = '1000';
                    burst.style.boxShadow = `0 0 20px ${color}`;
                    burst.style.borderRadius = '50%';
                    
                    document.body.appendChild(burst);
                    
                    const angle = (Math.PI * 2 * i) / 4;
                    const distance = 50;
                    
                    burst.animate([
                        { 
                            transform: 'translate(-50%, -50%) scale(1)', 
                            opacity: 1 
                        },
                        { 
                            transform: `translate(${Math.cos(angle) * distance - 50}%, ${Math.sin(angle) * distance - 50}%) scale(0)`, 
                            opacity: 0 
                        }
                    ], {
                        duration: 600,
                        easing: 'ease-out'
                    }).onfinish = () => burst.remove();
                }, i * 30);
            }
        });
    }

}

// Add CSS for glitch effect
const glitchCSS = `
@keyframes glitch {
    0% { transform: translate(0); }
    20% { transform: translate(-2px, 2px); }
    40% { transform: translate(-2px, -2px); }
    60% { transform: translate(2px, 2px); }
    80% { transform: translate(2px, -2px); }
    100% { transform: translate(0); }
}


.activity {
    margin-top: 10px;
    padding: 8px;
    background: rgba(0, 255, 65, 0.1);
    border: 1px solid #00ff41;
    font-size: 0.5rem;
}

.activity-name {
    color: #00ff41;
    font-weight: bold;
    margin-bottom: 4px;
}

.activity-details, .activity-state {
    color: #cccccc;
    font-size: 0.45rem;
}

.error {
    color: #ff4444;
    text-align: center;
    font-size: 0.6rem;
}
`;

// Add the CSS to the document
const style = document.createElement('style');
style.textContent = glitchCSS;
document.head.appendChild(style);

// Simple Portfolio Features
class SimplePortfolio {
    constructor() {
        this.init();
    }

    init() {
        this.createSimpleParticles();
        this.addSimpleInteractions();
    }

    createSimpleParticles() {
        const particlesContainer = document.querySelector('.floating-particles');
        
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 3 + 1 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = `rgba(74, 158, 255, ${Math.random() * 0.4 + 0.1})`;
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = `floatParticle ${Math.random() * 15 + 15}s linear infinite`;
            particle.style.animationDelay = Math.random() * 15 + 's';
            
            particlesContainer.appendChild(particle);
        }

        // Add CSS for floating particles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes floatParticle {
                0% {
                    transform: translateY(100vh);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                }
                90% {
                    opacity: 1;
                }
                100% {
                    transform: translateY(-100px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    addSimpleInteractions() {
        // Simple hover effects for skills
        const skills = document.querySelectorAll('.skill');
        skills.forEach(skill => {
            skill.addEventListener('mouseenter', () => {
                skill.style.transform = 'translateY(-2px) scale(1.05)';
            });
            skill.addEventListener('mouseleave', () => {
                skill.style.transform = '';
            });
        });

        // Simple hover effects for tags
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => {
            tag.addEventListener('mouseenter', () => {
                tag.style.transform = 'translateY(-2px) scale(1.05)';
            });
            tag.addEventListener('mouseleave', () => {
                tag.style.transform = '';
            });
        });
    }
}

// Initialize everything when DOM is loaded
// Custom Cursor Handler
class CustomCursor {
    constructor() {
        this.cursor = document.querySelector('.custom-cursor');
        this.cursorGlow = document.querySelector('.cursor-glow');
        this.init();
    }

    init() {
        if (!this.cursor || !this.cursorGlow) return;

        document.addEventListener('mousemove', (e) => {
            const x = e.clientX;
            const y = e.clientY;
            
            this.cursor.style.left = x - 10 + 'px';
            this.cursor.style.top = y - 10 + 'px';
            
            this.cursorGlow.style.left = x - 20 + 'px';
            this.cursorGlow.style.top = y - 20 + 'px';
        });

        // Add click effect
        document.addEventListener('click', (e) => {
            this.cursor.style.transform = 'scale(1.5)';
            setTimeout(() => {
                this.cursor.style.transform = 'scale(1)';
            }, 150);
        });

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            this.cursor.style.opacity = '0';
            this.cursorGlow.style.opacity = '0';
        });

        document.addEventListener('mouseenter', () => {
            this.cursor.style.opacity = '1';
            this.cursorGlow.style.opacity = '1';
        });
    }
}

// Life Quote System
class LifeQuoteSystem {
    constructor() {
        this.quotes = [
            "existence is just suffering with brief intermissions...",
            "we're all just pretending everything is fine...",
            "another day, another disappointment...",
            "the void stares back and it's bored...",
            "happiness is temporary, emptiness is forever...",
            "we're all dying slowly, some just faster...",
            "nothing really matters in the end...",
            "life is just waiting for something that never comes...",
            "we're all broken in different ways...",
            "the universe is indifferent to our pain...",
            "hope is just delayed disappointment...",
            "we're all alone in our own heads...",
            "time heals nothing, it just makes you numb...",
            "dreams die harder than people...",
            "we're all just ghosts haunting our own lives...",
            "the best days are behind us...",
            "we're all just noise in the silence...",
            "meaning is something we invented to cope...",
            "we're all just waiting for the credits to roll...",
            "reality is overrated and underwhelming...",
            "every smile is just hiding the emptiness inside...",
            "we're all just actors in a play nobody wants to watch...",
            "the darkness always wins in the end...",
            "love is just a chemical reaction that fades...",
            "we're all just counting down to nothing...",
            "hope is the cruelest joke of all...",
            "we're drowning in our own thoughts...",
            "the silence is louder than any scream...",
            "we're all just broken toys pretending to work...",
            "tomorrow will be just as empty as today..."
        ];
        this.currentQuoteIndex = this.getRandomIndex();
        this.timeLeft = 20;
        this.quoteElement = document.getElementById('quote-text');
        this.interval = null;
    }

    init() {
        this.displayCurrentQuote();
        this.startTimer();
    }

    displayCurrentQuote() {
        if (this.quoteElement) {
            this.quoteElement.textContent = this.quotes[this.currentQuoteIndex];
        }
    }

    getRandomIndex() {
        return Math.floor(Math.random() * this.quotes.length);
    }

    nextQuote() {
        // Get a different random quote (not the same as current)
        let newIndex;
        do {
            newIndex = this.getRandomIndex();
        } while (newIndex === this.currentQuoteIndex && this.quotes.length > 1);
        
        this.currentQuoteIndex = newIndex;
        this.displayCurrentQuote();
        this.timeLeft = 20;
    }

    updateTimer() {
        // Timer removed - quotes just fade into the void
    }

    startTimer() {
        this.updateTimer();
        
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            
            if (this.timeLeft <= 0) {
                this.nextQuote();
            }
        }, 1000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('✨ Initializing Simple Maxxie Portfolio...');
    
    // Initialize Lanyard integration
    const lanyard = new LanyardIntegration(CONFIG.DISCORD_USER_ID);
    lanyard.init();
    
    // Initialize simple pixel effects
    const effects = new PixelEffects();
    
    // Initialize simple portfolio features
    const simplePortfolio = new SimplePortfolio();

    // Initialize custom cursor
    const cursor = new CustomCursor();
    
    // Initialize life quote system
    const lifeQuotes = new LifeQuoteSystem();
    lifeQuotes.init();
    
    console.log('🎯 Simple Portfolio loaded successfully!');
});
