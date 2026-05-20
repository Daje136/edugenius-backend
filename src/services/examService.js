'use strict';

/**
 * Detect weak topics from graded exam answers.
 * A topic is "weak" if the student got < 50% correct in it.
 */
function detectWeakTopics(gradedAnswers, questionMap) {
  const topicStats = {};

  gradedAnswers.forEach(a => {
    const q = questionMap[a.questionId];
    if (!q || !q.topic) return;

    if (!topicStats[q.topic]) topicStats[q.topic] = { correct: 0, total: 0 };
    topicStats[q.topic].total++;
    if (a.correct) topicStats[q.topic].correct++;
  });

  return Object.entries(topicStats)
    .filter(([, s]) => s.total >= 2 && (s.correct / s.total) < 0.5)
    .map(([topic]) => topic);
}

/**
 * Calculate XP earned for an exam session.
 * Rewards accuracy, speed, and completion.
 */
function calculateXP(scorePercent, totalQuestions, timeSpentSeconds) {
  const BASE         = 50;
  const accuracyBonus = Math.round((scorePercent / 100) * 100); // 0–100
  const completionBonus = totalQuestions >= 40 ? 30 : totalQuestions >= 20 ? 15 : 5;

  // Speed bonus: under 2 min/question on average is efficient
  const avgTimePerQ = totalQuestions ? timeSpentSeconds / totalQuestions : 999;
  const speedBonus  = avgTimePerQ < 60 ? 20 : avgTimePerQ < 90 ? 10 : avgTimePerQ < 120 ? 5 : 0;

  return BASE + accuracyBonus + completionBonus + speedBonus;
}

/**
 * Build a simple exam timer config.
 * Standard WAEC: 45 questions = 45 min. JAMB: 40 questions = 30 min.
 */
function getTimeAllotted(examType, questionCount) {
  const perQuestionSeconds = {
    WAEC:    60,  // 1 min/question
    JAMB:    45,  // 45 sec/question
    UK_GCSE: 75,
    A_LEVEL: 90,
    PRIMARY: 60,
  };
  const secsPerQ = perQuestionSeconds[examType] || 60;
  return questionCount * secsPerQ;
}

module.exports = { detectWeakTopics, calculateXP, getTimeAllotted };
