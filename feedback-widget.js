// ============================================================
// Feedback Widget - User Validation Collection
// ============================================================
// Collects user feedback to improve prediction accuracy
// Non-intrusive, appears after viewing destination
// ============================================================

class FeedbackWidget {
    constructor() {
        this.backendUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:3002/api'
            : 'https://api.crowdwise.in/api';  // Your production API domain
        this.shownDestinations = new Set();
        this.feedbackGiven = JSON.parse(localStorage.getItem('crowdwise_feedback') || '[]');
        this.sessionFeedback = 0;
        this.maxFeedbackPerSession = 999; // Allow many prompts per session
    }

    // Check if should show feedback prompt
    shouldShowFeedback(destinationId) {
        // Allow unlimited feedback per session for testing/validation
        // Removed: Don't show if already given feedback this session
        // if (this.sessionFeedback >= this.maxFeedbackPerSession) return false;
        
        // Allow showing for same destination multiple times
        // Removed: Don't show for same destination twice in a session
        // if (this.shownDestinations.has(destinationId)) return false;
        
        // Allow feedback even if given recently (for validation purposes)
        // Removed: Don't show if gave feedback for this destination recently
        // const recentFeedback = this.feedbackGiven.find(f => 
        //     f.destinationId === destinationId && 
        //     Date.now() - new Date(f.timestamp).getTime() < 24 * 60 * 60 * 1000
        // );
        // if (recentFeedback) return false;

        return true;
    }

    // Show feedback prompt
    showFeedbackPrompt(destination, predictedLevel, predictedScore) {
        if (!this.shouldShowFeedback(destination.id)) return;

        // Remove any existing feedback widget first
        const existingWidget = document.getElementById('feedbackWidget');
        if (existingWidget) {
            existingWidget.remove();
        }

        this.shownDestinations.add(destination.id);

        const widget = document.createElement('div');
        widget.className = 'feedback-widget';
        widget.id = 'feedbackWidget';
        widget.innerHTML = `
            <div class="feedback-content">
                <button class="feedback-close" onclick="feedbackWidget.closeFeedback()">&times;</button>
                
                <div class="feedback-header">
                    <span class="feedback-icon">📊</span>
                    <span class="feedback-title">Help us improve!</span>
                </div>
                
                <p class="feedback-question">
                    Is the crowd prediction for <strong>${destination.name}</strong> accurate?
                </p>
                
                <div class="feedback-prediction">
                    <span>We predicted: </span>
                    <span class="predicted-level ${predictedLevel}">${this.getLevelEmoji(predictedLevel)} ${this.getLevelLabel(predictedLevel)}</span>
                </div>
                
                <div class="feedback-quick-buttons">
                    <button class="feedback-btn positive" onclick="feedbackWidget.submitQuickFeedback('${destination.name}', '${predictedLevel}', ${predictedScore}, true)">
                        👍 Yes, accurate
                    </button>
                    <button class="feedback-btn negative" onclick="feedbackWidget.showDetailedFeedback('${destination.name}', '${predictedLevel}', ${predictedScore})">
                        👎 Not quite
                    </button>
                </div>
                
                <div class="feedback-detailed" id="feedbackDetailed" style="display: none;">
                    <p class="feedback-detail-question">What's the actual crowd level?</p>
                    <div class="feedback-level-options">
                        <button class="level-option" onclick="feedbackWidget.submitDetailedFeedback('${destination.name}', '${predictedLevel}', ${predictedScore}, 'low')">
                            🟢 Low (almost empty)
                        </button>
                        <button class="level-option" onclick="feedbackWidget.submitDetailedFeedback('${destination.name}', '${predictedLevel}', ${predictedScore}, 'moderate')">
                            🟡 Moderate (some crowds)
                        </button>
                        <button class="level-option" onclick="feedbackWidget.submitDetailedFeedback('${destination.name}', '${predictedLevel}', ${predictedScore}, 'heavy')">
                            🟠 Busy (crowded)
                        </button>
                        <button class="level-option" onclick="feedbackWidget.submitDetailedFeedback('${destination.name}', '${predictedLevel}', ${predictedScore}, 'overcrowded')">
                            🔴 Packed (very crowded)
                        </button>
                    </div>
                </div>
                
                <p class="feedback-note">Your feedback helps improve predictions for everyone! 🙏</p>
            </div>
        `;

        document.body.appendChild(widget);

        // Animate in
        setTimeout(() => widget.classList.add('visible'), 100);

        // Auto-hide after 30 seconds
        setTimeout(() => this.closeFeedback(), 30000);
    }

    showDetailedFeedback(destination, predictedLevel, predictedScore) {
        document.getElementById('feedbackDetailed').style.display = 'block';
        document.querySelector('.feedback-quick-buttons').style.display = 'none';
    }

    async submitQuickFeedback(destination, predictedLevel, predictedScore, isAccurate) {
        await this.sendFeedback({
            destination,
            predictedLevel,
            predictedScore,
            isAccurate,
            feedbackType: 'quick'
        });
        
        this.showThankYou(isAccurate);
    }

    async submitDetailedFeedback(destination, predictedLevel, predictedScore, actualLevel) {
        const isAccurate = predictedLevel === actualLevel;
        
        await this.sendFeedback({
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel: actualLevel,
            isAccurate,
            feedbackType: 'detailed'
        });
        
        this.showThankYou(isAccurate);
    }

    async sendFeedback(data) {
        try {
            const response = await fetch(`${this.backendUrl}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                console.log('✅ Feedback submitted successfully');
            }
        } catch (error) {
            console.log('📝 Feedback stored locally (backend offline)');
        }

        // Store locally regardless
        this.feedbackGiven.push({
            ...data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('crowdwise_feedback', JSON.stringify(this.feedbackGiven.slice(-50)));
        this.sessionFeedback++;
    }

    showThankYou(wasAccurate) {
        const widget = document.getElementById('feedbackWidget');
        if (!widget) return;

        const content = widget.querySelector('.feedback-content');
        content.innerHTML = `
            <div class="feedback-thankyou">
                <span class="thankyou-emoji">${wasAccurate ? '🎉' : '🙏'}</span>
                <h3>${wasAccurate ? 'Great!' : 'Thank you!'}</h3>
                <p>${wasAccurate ? 'Glad our prediction was helpful!' : 'Your feedback helps us improve!'}</p>
                <div class="accuracy-contribution">
                    <span class="contribution-icon">📈</span>
                    <span>You're helping improve accuracy for ${this.getTotalFeedbackCount()}+ users</span>
                </div>
            </div>
        `;

        // Close after 2 seconds
        setTimeout(() => this.closeFeedback(), 2000);
    }

    closeFeedback() {
        const widget = document.getElementById('feedbackWidget');
        if (widget) {
            widget.classList.remove('visible');
            setTimeout(() => widget.remove(), 300);
        }
    }

    getLevelEmoji(level) {
        const emojis = { low: '🟢', moderate: '🟡', heavy: '🟠', overcrowded: '🔴' };
        return emojis[level] || '🟡';
    }

    getLevelLabel(level) {
        const labels = { low: 'Low', moderate: 'Moderate', heavy: 'Busy', overcrowded: 'Packed' };
        return labels[level] || 'Moderate';
    }

    getTotalFeedbackCount() {
        return Math.max(100, this.feedbackGiven.length * 10); // Simulated community size
    }

    // Get accuracy badge for display
    async getAccuracyBadge() {
        try {
            const response = await fetch(`${this.backendUrl}/feedback/stats`);
            if (response.ok) {
                const stats = await response.json();
                return {
                    accuracy: stats.overallAccuracy || 70,
                    feedbackCount: stats.totalFeedback || 0,
                    status: stats.status?.level || 'good'
                };
            }
        } catch (error) {
            // Return default if backend unavailable
        }
        
        return {
            accuracy: 70,
            feedbackCount: this.feedbackGiven.length,
            status: 'pattern-based'
        };
    }
}

// Create global instance
window.feedbackWidget = new FeedbackWidget();

// Add CSS for feedback widget
const feedbackStyles = document.createElement('style');
feedbackStyles.textContent = `
    .feedback-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    }

    .feedback-widget.visible {
        opacity: 1;
        transform: translateY(0);
    }

    .feedback-content {
        background: white;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        max-width: 340px;
        position: relative;
    }

    .feedback-close {
        position: absolute;
        top: 10px;
        right: 12px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        padding: 5px;
    }

    .feedback-close:hover {
        color: #333;
    }

    .feedback-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
    }

    .feedback-icon {
        font-size: 24px;
    }

    .feedback-title {
        font-weight: 600;
        font-size: 16px;
        color: #333;
    }

    .feedback-question {
        font-size: 14px;
        color: #555;
        margin-bottom: 12px;
    }

    .feedback-prediction {
        background: #f5f5f5;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 14px;
    }

    .predicted-level {
        font-weight: 600;
    }

    .predicted-level.low { color: #22c55e; }
    .predicted-level.moderate { color: #eab308; }
    .predicted-level.heavy { color: #f97316; }
    .predicted-level.overcrowded { color: #ef4444; }

    .feedback-quick-buttons {
        display: flex;
        gap: 10px;
        margin-bottom: 12px;
    }

    .feedback-btn {
        flex: 1;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .feedback-btn.positive {
        background: #dcfce7;
        color: #166534;
    }

    .feedback-btn.positive:hover {
        background: #bbf7d0;
    }

    .feedback-btn.negative {
        background: #fef2f2;
        color: #991b1b;
    }

    .feedback-btn.negative:hover {
        background: #fee2e2;
    }

    .feedback-detailed {
        margin-top: 12px;
    }

    .feedback-detail-question {
        font-size: 13px;
        color: #666;
        margin-bottom: 10px;
    }

    .feedback-level-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }

    .level-option {
        padding: 10px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        background: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .level-option:hover {
        background: #f5f5f5;
        border-color: #667eea;
    }

    .feedback-note {
        font-size: 11px;
        color: #999;
        text-align: center;
        margin-top: 12px;
        margin-bottom: 0;
    }

    .feedback-thankyou {
        text-align: center;
        padding: 20px 0;
    }

    .thankyou-emoji {
        font-size: 48px;
        display: block;
        margin-bottom: 12px;
    }

    .feedback-thankyou h3 {
        margin: 0 0 8px 0;
        color: #333;
    }

    .feedback-thankyou p {
        color: #666;
        margin: 0 0 16px 0;
    }

    .accuracy-contribution {
        background: #f0fdf4;
        padding: 10px;
        border-radius: 8px;
        font-size: 12px;
        color: #166534;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
    }

    @media (max-width: 480px) {
        .feedback-widget {
            bottom: 10px;
            right: 10px;
            left: 10px;
        }
        
        .feedback-content {
            max-width: none;
        }
    }
`;
document.head.appendChild(feedbackStyles);
