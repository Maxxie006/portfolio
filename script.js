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
            indicator.classList.add(`status-${data.discord_status}`);
        }

        // Update profile picture if avatar is available
        const profilePicture = document.getElementById('profile-picture');
        if (profilePicture && data.discord_user.avatar) {
            const avatarUrl = `https://cdn.discordapp.com/avatars/${data.discord_user.id}/${data.discord_user.avatar}.png?size=256`;
            profilePicture.style.backgroundImage = `url(${avatarUrl})`;
            profilePicture.style.backgroundSize = 'cover';
            profilePicture.style.backgroundPosition = 'center';
        }

        // Create enhanced status display
        const statusContainer = createElement('div', 'discord-user');
        
        // User info section
        const userInfo = createElement('div', 'discord-user-info');
        
        // Username and discriminator
        const username = createElement('h3', 'discord-username');
        username.textContent = data.discord_user.username;
        if (data.discord_user.discriminator && data.discord_user.discriminator !== '0') {
            username.textContent += `#${data.discord_user.discriminator}`;
        }
        userInfo.appendChild(username);

        // Status with color
        const statusText = createElement('p', 'discord-status-text');
        const statusLabel = this.getStatusText(data.discord_status);
        statusText.innerHTML = `<span class="status-${data.discord_status}">${statusLabel.toUpperCase()}</span>`;
        userInfo.appendChild(statusText);

        // Custom status (if available)
        if (data.activities) {
            const customStatus = data.activities.find(activity => activity.type === 4);
            if (customStatus && customStatus.state) {
                const customStatusText = createElement('p', 'discord-custom-status');
                customStatusText.textContent = `"${customStatus.state}"`;
                userInfo.appendChild(customStatusText);
            }
        }

        statusContainer.appendChild(userInfo);

        // Activities section
        if (data.activities && data.activities.length > 0) {
            const activitiesSection = createElement('div', 'discord-activities');
            const activitiesTitle = createElement('h4', 'activities-title');
            activitiesTitle.textContent = 'Currently';
            activitiesSection.appendChild(activitiesTitle);

            data.activities.forEach(activity => {
                if (activity.type !== 4) { // Skip custom status
                    const activityElement = this.createEnhancedActivityElement(activity);
                    activitiesSection.appendChild(activityElement);
                }
            });

            statusContainer.appendChild(activitiesSection);
        }

        // Server info (if available)
        if (data.guilds && data.guilds.length > 0) {
            const serverInfo = createElement('div', 'discord-server-info');
            const serverTitle = createElement('h4', 'server-title');
            serverTitle.textContent = 'Servers';
            serverInfo.appendChild(serverTitle);
            
            const serverCount = createElement('p', 'server-count');
            serverCount.textContent = `${data.guilds.length} servers`;
            serverInfo.appendChild(serverCount);
            
            statusContainer.appendChild(serverInfo);
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

    createEnhancedActivityElement(activity) {
        const activityDiv = createElement('div', 'enhanced-activity');
        
        // Activity icon (if available)
        if (activity.assets && activity.assets.large_image) {
            const icon = createElement('div', 'activity-icon');
            const iconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
            icon.style.backgroundImage = `url(${iconUrl})`;
            activityDiv.appendChild(icon);
        }

        // Activity content
        const content = createElement('div', 'activity-content');
        
        // Activity name
        const activityName = createElement('h5', 'activity-name', activity.name);
        content.appendChild(activityName);

        // Activity type
        const activityType = createElement('p', 'activity-type', this.getActivityType(activity.type));
        content.appendChild(activityType);

        // Details and state
        if (activity.details) {
            const details = createElement('p', 'activity-details', activity.details);
            content.appendChild(details);
        }

        if (activity.state) {
            const state = createElement('p', 'activity-state', activity.state);
            content.appendChild(state);
        }

        // Timestamps
        if (activity.timestamps) {
            const timeInfo = createElement('p', 'activity-time');
            if (activity.timestamps.start) {
                const startTime = new Date(activity.timestamps.start);
                timeInfo.textContent = `Started: ${startTime.toLocaleTimeString()}`;
            }
            content.appendChild(timeInfo);
        }

        activityDiv.appendChild(content);
        return activityDiv;
    }

    getActivityType(type) {
        const types = {
            0: 'Playing',
            1: 'Streaming',
            2: 'Listening to',
            3: 'Watching',
            4: 'Custom Status',
            5: 'Competing in'
        };
        return types[type] || 'Unknown';
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

// Enhanced Portfolio Features
class EnhancedPortfolio {
    constructor() {
        this.init();
    }

    init() {
        this.createEnhancedParticles();
        this.addEnhancedInteractions();
        this.addKeyboardShortcuts();
        this.addScrollEffects();
    }

    createEnhancedParticles() {
        const particlesContainer = document.querySelector('.floating-particles');
        const darkParticlesContainer = document.querySelector('.dark-particles');
        
        // Create fewer light particles for better performance
        for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 3 + 1 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = `rgba(100, 150, 255, ${Math.random() * 0.2 + 0.1})`;
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = `floatUp ${Math.random() * 20 + 20}s linear infinite`;
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.willChange = 'transform, opacity';
            
            particlesContainer.appendChild(particle);
        }

        // Create fewer dark particles for better performance
        for (let i = 0; i < 4; i++) {
            const particle = document.createElement('div');
            particle.className = 'dark-particle';
            particle.style.position = 'absolute';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = `rgba(0, 0, 0, ${Math.random() * 0.3 + 0.1})`;
            particle.style.borderRadius = '50%';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animation = `darkFloat ${Math.random() * 25 + 25}s linear infinite`;
            particle.style.animationDelay = Math.random() * 25 + 's';
            particle.style.willChange = 'transform, opacity';
            
            darkParticlesContainer.appendChild(particle);
        }

        // Reduced spooky orb frequency for better performance
        setInterval(() => {
            if (Math.random() < 0.1) { // Reduced from 0.3 to 0.1
                const orb = document.createElement('div');
                orb.className = 'spooky-orb';
                orb.style.position = 'absolute';
                orb.style.width = Math.random() * 30 + 15 + 'px';
                orb.style.height = orb.style.width;
                orb.style.left = Math.random() * 100 + '%';
                orb.style.top = Math.random() * 100 + '%';
                orb.style.animation = `spookyDrift ${Math.random() * 30 + 30}s ease-in-out infinite`;
                orb.style.willChange = 'transform, opacity';
                
                darkParticlesContainer.appendChild(orb);
                
                setTimeout(() => {
                    if (orb.parentNode) {
                        orb.parentNode.removeChild(orb);
                    }
                }, 40000); // Increased duration
            }
        }, 15000); // Increased interval
    }

    addEnhancedInteractions() {
        // Enhanced hover effects for tags
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => {
            tag.addEventListener('mouseenter', () => {
                tag.style.transform = 'translateY(-3px) scale(1.05)';
                tag.style.boxShadow = '0 8px 25px rgba(100, 150, 255, 0.2)';
                tag.style.borderColor = 'rgba(100, 150, 255, 0.5)';
            });
            tag.addEventListener('mouseleave', () => {
                tag.style.transform = '';
                tag.style.boxShadow = '';
                tag.style.borderColor = '';
            });
        });

        // Enhanced profile picture interaction
        const profilePicture = document.querySelector('.profile-picture');
        if (profilePicture) {
            profilePicture.addEventListener('mouseenter', () => {
                profilePicture.style.transform = 'scale(1.1) rotate(2deg)';
                profilePicture.style.boxShadow = '0 0 30px rgba(100, 150, 255, 0.4)';
            });
            profilePicture.addEventListener('mouseleave', () => {
                profilePicture.style.transform = 'scale(1) rotate(0deg)';
                profilePicture.style.boxShadow = '';
            });
        }

        // Add click ripple effect
        document.addEventListener('click', (e) => {
            this.createRipple(e.clientX, e.clientY);
        });
    }

    createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '0px';
        ripple.style.height = '0px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(100, 150, 255, 0.3)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '9999';
        ripple.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(ripple);
        
        const animation = ripple.animate([
            { width: '0px', height: '0px', opacity: 1 },
            { width: '100px', height: '100px', opacity: 0 }
        ], {
            duration: 600,
            easing: 'ease-out'
        });
        
        animation.onfinish = () => {
            ripple.remove();
        };
    }

    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Space bar to change quote
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                const quoteSystem = window.lifeQuotes;
                if (quoteSystem) {
                    quoteSystem.nextQuote();
                }
            }
            
            // Escape to reset animations
            if (e.code === 'Escape') {
                document.querySelectorAll('*').forEach(el => {
                    el.style.animationPlayState = 'paused';
                });
                setTimeout(() => {
                    document.querySelectorAll('*').forEach(el => {
                        el.style.animationPlayState = 'running';
                    });
                }, 1000);
            }
        });
    }

    addScrollEffects() {
        // Optimized scroll effects with throttling
        let mouseY = 0;
        let animationFrame = null;
        
        const updateParticles = () => {
            const particles = document.querySelectorAll('.particle, .dark-particle');
            particles.forEach((particle, index) => {
                const speed = (index % 3 + 1) * 0.3; // Reduced speed for better performance
                particle.style.transform = `translateY(${mouseY * speed}px)`;
            });
            animationFrame = null;
        };
        
        document.addEventListener('mousemove', (e) => {
            mouseY = e.clientY / window.innerHeight;
            
            // Throttle updates using requestAnimationFrame
            if (!animationFrame) {
                animationFrame = requestAnimationFrame(updateParticles);
            }
        });
    }
}

// Initialize everything when DOM is loaded
// Enhanced Custom Cursor Handler
class CustomCursor {
    constructor() {
        this.cursor = document.querySelector('.custom-cursor');
        this.cursorGlow = document.querySelector('.cursor-glow');
        this.isHovering = false;
        this.init();
    }

    init() {
        if (!this.cursor || !this.cursorGlow) return;

        let mouseX = 0, mouseY = 0;
        let animationFrame = null;

        const updateCursor = () => {
            this.cursor.style.left = mouseX - 4 + 'px';
            this.cursor.style.top = mouseY - 4 + 'px';
            
            this.cursorGlow.style.left = mouseX - 12 + 'px';
            this.cursorGlow.style.top = mouseY - 12 + 'px';
            animationFrame = null;
        };

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            if (!animationFrame) {
                animationFrame = requestAnimationFrame(updateCursor);
            }
        });

        // Enhanced click effect
        document.addEventListener('click', (e) => {
            this.cursor.style.transform = 'scale(1.8)';
            this.cursorGlow.style.transform = 'scale(1.5)';
            setTimeout(() => {
                this.cursor.style.transform = 'scale(1)';
                this.cursorGlow.style.transform = 'scale(1)';
            }, 200);
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

        // Enhanced hover effects
        this.addHoverEffects();
    }

    addHoverEffects() {
        const hoverElements = document.querySelectorAll('a, .tag, .profile-picture');
        
        hoverElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                this.cursor.style.transform = 'scale(1.5)';
                this.cursorGlow.style.transform = 'scale(1.3)';
                this.cursor.style.background = 'rgba(100, 150, 255, 0.6)';
            });
            
            element.addEventListener('mouseleave', () => {
                this.cursor.style.transform = 'scale(1)';
                this.cursorGlow.style.transform = 'scale(1)';
                this.cursor.style.background = 'rgba(255, 255, 255, 0.4)';
            });
        });
    }
}

// Life Quote System
class LifeQuoteSystem {
    constructor() {
        this.quotes = [
            "i want to disappear into the void forever...",
            "every breath feels like a mistake...",
            "the pain never stops, it just changes form...",
            "i'm already dead inside, just waiting for my body to catch up...",
            "existence is a curse i never asked for...",
            "i dream of the sweet release of nothingness...",
            "every day i wake up disappointed i'm still here...",
            "the world would be better without me in it...",
            "i'm just a burden on everyone around me...",
            "death seems like the only logical solution...",
            "i'm trapped in this nightmare called life...",
            "the darkness is calling and i want to answer...",
            "i'm already a ghost, just waiting to fade away...",
            "every moment is torture, every second is hell...",
            "i wish i was never born...",
            "the pain is so deep it's become my only friend...",
            "i'm drowning in my own despair...",
            "the end can't come soon enough...",
            "i'm just a walking corpse with a heartbeat...",
            "the void is the only thing that makes sense...",
            "i'm tired of pretending to be human...",
            "every day is a battle i'm losing...",
            "the silence of death sounds peaceful...",
            "i'm already gone, just my body remains...",
            "the world is too cruel for someone like me...",
            "i want to erase myself from existence...",
            "the pain is the only thing that feels real...",
            "i'm just a mistake that should be corrected...",
            "death is the only freedom left...",
            "i'm already dead, just waiting for the funeral..."
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
            this.typeQuote(this.quotes[this.currentQuoteIndex]);
        }
    }

    typeQuote(quote) {
        if (!this.quoteElement) return;
        
        // Clear the element
        this.quoteElement.textContent = '';
        this.quoteElement.style.width = '0';
        
        // Start typing animation
        let i = 0;
        const typeInterval = setInterval(() => {
            if (i < quote.length) {
                this.quoteElement.textContent += quote.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
                // Remove the typing cursor after completion
                setTimeout(() => {
                    this.quoteElement.style.borderRight = 'none';
                }, 1000);
            }
        }, 200); // Much slower, more depressing typing speed (200ms per character)
    }

    backspaceQuote() {
        if (!this.quoteElement) return;
        
        const currentText = this.quoteElement.textContent;
        let i = currentText.length;
        
        const backspaceInterval = setInterval(() => {
            if (i > 0) {
                this.quoteElement.textContent = currentText.substring(0, i - 1);
                i--;
            } else {
                clearInterval(backspaceInterval);
                // After backspacing is complete, type the new quote
                this.typeQuote(this.quotes[this.currentQuoteIndex]);
            }
        }, 120); // Slower backspace speed (120ms per character)
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
        
        // Reset the typing cursor for the new quote
        if (this.quoteElement) {
            this.quoteElement.style.borderRight = '2px solid var(--text-muted)';
        }
        
        // Start backspace animation, then type new quote
        this.backspaceQuote();
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
    console.log('✨ Initializing Enhanced Maxxie Portfolio...');
    
    // Initialize Lanyard integration
    const lanyard = new LanyardIntegration(CONFIG.DISCORD_USER_ID);
    lanyard.init();
    
    // Initialize enhanced pixel effects
    const effects = new PixelEffects();
    
    // Initialize enhanced portfolio features
    const enhancedPortfolio = new EnhancedPortfolio();

    // Initialize custom cursor
    const cursor = new CustomCursor();
    
    // Initialize life quote system
    const lifeQuotes = new LifeQuoteSystem();
    lifeQuotes.init();
    
    // Make quote system globally accessible for keyboard shortcuts
    window.lifeQuotes = lifeQuotes;
    
    console.log('🎯 Enhanced Portfolio loaded successfully!');
    console.log('💡 Try pressing SPACE to change quotes or ESC to pause animations');
});
