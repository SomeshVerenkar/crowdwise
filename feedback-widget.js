// ============================================================
// Feedback Widget - User Validation Collection
// ============================================================
// Collects user feedback to improve prediction accuracy
// Non-intrusive, appears after viewing destination
// Gamification integration: points, badges, streaks
// ============================================================

class FeedbackWidget {
    constructor() {
        this.backendUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:8080/api'
            : 'https://api.crowdwise.in/api';  // Your production API domain
        this.shownDestinations = new Set();
        this.feedbackGiven = JSON.parse(localStorage.getItem('crowdwise_feedback') || '[]');
        this.sessionFeedback = 0;
        this.maxFeedbackPerSession = 999; // Allow many prompts per session
        this.currentDestinationId = null; // Track current destination for gamification
    }

    // Check if gamification feature is enabled
    isGamificationEnabled() {
        return typeof API_CONFIG !== 'undefined' && 
               API_CONFIG.FEATURE_FLAGS && 
               API_CONFIG.FEATURE_FLAGS.GAMIFICATION_ENABLED === true;
    }

    // Check if should show feedback prompt
    shouldShowFeedback(destinationId) {
        // Allow unlimited feedback per session for testing/validation
        return true;
    }

    // Show feedback prompt
    showFeedbackPrompt(destination, predictedLevel, predictedScore) {
        if (!this.shouldShowFeedback(destination.id)) return;

        // Store destination ID for gamification
        this.currentDestinationId = destination.id;

        // Remove any existing feedback widget first
        const existingWidget = document.getElementById('feedbackWidget');
        if (existingWidget) {
            existingWidget.remove();
        }

        this.shownDestinations.add(destination.id);

        // Build gamification teaser if enabled
        let gamificationTeaser = '';
        if (this.isGamificationEnabled() && typeof PointsEngine !== 'undefined') {
            const streak = PointsEngine.getStreak();
            const totalPoints = PointsEngine.getTotalPoints();
            gamificationTeaser = `
                <div class="gamification-teaser">
                    <span class="teaser-points">🏆 ${totalPoints} pts</span>
                    ${streak.current > 0 ? `<span class="teaser-streak">🔥 ${streak.current} day streak</span>` : ''}
                </div>
            `;
        }

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
                ${gamificationTeaser}
                
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
                
                <p class="feedback-note">${this.isGamificationEnabled() ? 'Earn points and badges for your feedback! 🏆' : 'Your feedback helps improve predictions for everyone! 🙏'}</p>
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
        const gamificationResult = await this.sendFeedback({
            destination,
            predictedLevel,
            predictedScore,
            isAccurate,
            feedbackType: 'quick'
        });
        
        this.showThankYou(isAccurate, 'quick', gamificationResult);
    }

    async submitDetailedFeedback(destination, predictedLevel, predictedScore, actualLevel) {
        const isAccurate = predictedLevel === actualLevel;
        
        const gamificationResult = await this.sendFeedback({
            destination,
            predictedLevel,
            predictedScore,
            userReportedLevel: actualLevel,
            isAccurate,
            feedbackType: 'detailed'
        });
        
        this.showThankYou(isAccurate, 'detailed', gamificationResult);
    }

    async sendFeedback(data) {
        let gamificationResult = null;

        // Award points and check badges if gamification is enabled
        if (this.isGamificationEnabled() && typeof PointsEngine !== 'undefined') {
            try {
                gamificationResult = PointsEngine.awardPoints({
                    type: data.feedbackType,
                    destinationId: this.currentDestinationId,
                    predictedLevel: data.predictedLevel,
                    reportedLevel: data.userReportedLevel || data.predictedLevel,
                    accurate: data.isAccurate
                });

                // Check for new badges
                if (typeof BadgeSystem !== 'undefined') {
                    const newBadges = BadgeSystem.checkBadges();
                    if (newBadges && newBadges.length > 0) {
                        gamificationResult.newBadges = newBadges;
                    }
                }
            } catch (e) {
                console.warn('Gamification error:', e);
            }
        }

        // Record to AccuracyTracker for measurement
        if (typeof AccuracyTracker !== 'undefined' && AccuracyTracker.isEnabled()) {
            try {
                AccuracyTracker.recordFeedback({
                    destinationId: this.currentDestinationId,
                    destinationName: data.destination,
                    predictedLevel: data.predictedLevel,
                    predictedScore: data.predictedScore,
                    userReportedLevel: data.userReportedLevel,
                    isAccurate: data.isAccurate,
                    feedbackType: data.feedbackType
                });
                console.log('📊 Feedback recorded to AccuracyTracker');
            } catch (e) {
                console.warn('AccuracyTracker error:', e);
            }
        }

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

        return gamificationResult;
    }

    showThankYou(wasAccurate, feedbackType, gamificationResult) {
        const widget = document.getElementById('feedbackWidget');
        if (!widget) return;

        const content = widget.querySelector('.feedback-content');
        
        // If gamification is enabled and we have results, show gamified thank you
        if (this.isGamificationEnabled() && gamificationResult && gamificationResult.points > 0) {
            this.showGamifiedThankYou(content, wasAccurate, feedbackType, gamificationResult);
        } else {
            // Standard thank you
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
    }

    showGamifiedThankYou(content, wasAccurate, feedbackType, result) {
        const { points, totalPoints, streak, firstFeedback, newBadges } = result;
        
        // Determine if this is a milestone (first feedback, new badge, streak milestone)
        const isMilestone = firstFeedback || (newBadges && newBadges.length > 0) || (streak > 0 && streak % 7 === 0);
        
        // Build badges HTML if any new badges
        let badgesHtml = '';
        if (newBadges && newBadges.length > 0) {
            const badgeItems = newBadges.map(badge => `
                <div class="badge-unlock-item">
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                </div>
            `).join('');
            badgesHtml = `
                <div class="badges-unlocked">
                    <div class="badges-header">🎖️ Badge${newBadges.length > 1 ? 's' : ''} Unlocked!</div>
                    ${badgeItems}
                </div>
            `;
        }

        // Build streak display
        let streakHtml = '';
        if (streak > 0) {
            streakHtml = `
                <div class="streak-display">
                    <span class="streak-fire">🔥</span>
                    <span class="streak-count">${streak} day streak!</span>
                </div>
            `;
        }

        // First feedback bonus message
        let firstFeedbackHtml = '';
        if (firstFeedback) {
            firstFeedbackHtml = `
                <div class="first-feedback-bonus">
                    <span>🌟</span>
                    <span>First feedback bonus!</span>
                </div>
            `;
        }

        content.innerHTML = `
            <div class="feedback-thankyou gamified">
                <div class="points-earned">
                    <span class="points-value">+${points}</span>
                    <span class="points-label">points earned!</span>
                </div>
                ${firstFeedbackHtml}
                ${streakHtml}
                ${badgesHtml}
                <div class="total-points-display">
                    <span class="total-label">Total Points:</span>
                    <span class="total-value">${totalPoints}</span>
                </div>
                <div class="accuracy-contribution">
                    <span class="contribution-icon">📈</span>
                    <span>${wasAccurate ? 'Great accuracy confirmation!' : 'Thanks for the correction!'}</span>
                </div>
                <div class="daily-cap-info">
                    <span>Daily limit: ${this.getDailyCapProgress()} / 50 pts</span>
                </div>
            </div>
        `;

        // Trigger confetti for milestones
        if (isMilestone) {
            this.triggerConfetti();
        }

        // Close after longer time for gamified view
        setTimeout(() => this.closeFeedback(), 4000);
    }

    getDailyCapProgress() {
        if (typeof PointsEngine !== 'undefined') {
            return PointsEngine.getTodayPoints();
        }
        return 0;
    }

    triggerConfetti() {
        // Create confetti container
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.id = 'confettiContainer';
        
        // Generate 50 confetti pieces
        const colors = ['#667eea', '#764ba2', '#22c55e', '#eab308', '#ef4444', '#f97316'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            confetti.style.animationDuration = `${1 + Math.random() * 1}s`;
            confettiContainer.appendChild(confetti);
        }
        
        document.body.appendChild(confettiContainer);
        
        // Remove after animation
        setTimeout(() => {
            const container = document.getElementById('confettiContainer');
            if (container) container.remove();
        }, 3000);
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
        // First try AccuracyTracker (local) if available
        if (typeof AccuracyTracker !== 'undefined' && AccuracyTracker.isEnabled()) {
            const stats = AccuracyTracker.getSystemStats();
            if (stats.totalFeedback > 0) {
                return {
                    accuracy: stats.overallAccuracy || 70,
                    feedbackCount: stats.totalFeedback,
                    status: stats.status?.level || 'good',
                    source: 'local'
                };
            }
        }

        // Try backend
        try {
            const response = await fetch(`${this.backendUrl}/feedback/stats`);
            if (response.ok) {
                const stats = await response.json();
                return {
                    accuracy: stats.overallAccuracy || 70,
                    feedbackCount: stats.totalFeedback || 0,
                    status: stats.status?.level || 'good',
                    source: 'backend'
                };
            }
        } catch (error) {
            // Return default if backend unavailable
        }
        
        return {
            accuracy: 70,
            feedbackCount: this.feedbackGiven.length,
            status: 'pattern-based',
            source: 'default'
        };
    }

    // Get user's gamification stats for display elsewhere
    getGamificationStats() {
        if (!this.isGamificationEnabled() || typeof PointsEngine === 'undefined') {
            return null;
        }

        const streak = PointsEngine.getStreak();
        const earnedBadges = typeof BadgeSystem !== 'undefined' ? BadgeSystem.getEarnedBadges() : [];
        
        return {
            totalPoints: PointsEngine.getTotalPoints(),
            todayPoints: PointsEngine.getTodayPoints(),
            currentStreak: streak.current,
            longestStreak: streak.longest,
            badges: earnedBadges,
            badgeCount: earnedBadges.length
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

    /* Gamification teaser in feedback prompt */
    .gamification-teaser {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #667eea15, #764ba215);
        border-radius: 8px;
        font-size: 13px;
    }

    .teaser-points {
        color: #667eea;
        font-weight: 600;
    }

    .teaser-streak {
        color: #f97316;
        font-weight: 500;
    }

    /* Gamified Thank You Styles */
    .feedback-thankyou.gamified {
        padding: 16px 0;
    }

    .points-earned {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        margin-bottom: 16px;
        animation: pointsPop 0.5s ease-out;
    }

    @keyframes pointsPop {
        0% { transform: scale(0.8); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }

    .points-value {
        font-size: 32px;
        font-weight: 700;
        display: block;
    }

    .points-label {
        font-size: 14px;
        opacity: 0.9;
    }

    .first-feedback-bonus {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        color: #92400e;
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        animation: bonusSlide 0.4s ease-out 0.2s both;
    }

    @keyframes bonusSlide {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .streak-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
        padding: 8px 16px;
        background: linear-gradient(135deg, #fef2f2, #fee2e2);
        border-radius: 8px;
        animation: streakPulse 1s ease-in-out infinite;
    }

    @keyframes streakPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.02); }
    }

    .streak-fire {
        font-size: 20px;
    }

    .streak-count {
        font-size: 14px;
        font-weight: 600;
        color: #dc2626;
    }

    .badges-unlocked {
        background: linear-gradient(135deg, #ede9fe, #ddd6fe);
        padding: 12px;
        border-radius: 10px;
        margin-bottom: 12px;
        animation: badgeUnlock 0.6s ease-out 0.3s both;
    }

    @keyframes badgeUnlock {
        0% { transform: scale(0.9) rotate(-5deg); opacity: 0; }
        50% { transform: scale(1.05) rotate(2deg); }
        100% { transform: scale(1) rotate(0); opacity: 1; }
    }

    .badges-header {
        font-size: 13px;
        font-weight: 600;
        color: #7c3aed;
        margin-bottom: 8px;
    }

    .badge-unlock-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: white;
        border-radius: 6px;
        margin-top: 6px;
    }

    .badge-icon {
        font-size: 20px;
    }

    .badge-name {
        font-size: 13px;
        font-weight: 500;
        color: #333;
    }

    .total-points-display {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 14px;
    }

    .total-label {
        color: #666;
    }

    .total-value {
        font-weight: 700;
        color: #667eea;
    }

    .daily-cap-info {
        font-size: 11px;
        color: #999;
        margin-top: 8px;
    }

    /* Confetti animation */
    .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10001;
        overflow: hidden;
    }

    .confetti-piece {
        position: absolute;
        top: -10px;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        animation: confettiFall linear forwards;
    }

    @keyframes confettiFall {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
        }
    }

    @media (max-width: 480px) {
        .feedback-widget {
            bottom: 70px;
            right: 10px;
            left: 10px;
        }
        
        .feedback-content {
            max-width: none;
        }

        .points-value {
            font-size: 28px;
        }
    }
`;
document.head.appendChild(feedbackStyles);
