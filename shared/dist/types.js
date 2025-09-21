"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_TIMEOUT = exports.SUPPORTED_VIDEO_TYPES = exports.SUPPORTED_IMAGE_TYPES = exports.MAX_UPLOAD_SIZE = exports.MIN_PASSWORD_LENGTH = exports.MAX_PAGINATION_LIMIT = exports.DEFAULT_PAGINATION_LIMIT = exports.SessionStatus = exports.RoomType = exports.MessageType = exports.RecommendationType = exports.InsightType = exports.AnalyticsTimeframe = exports.QuestionType = exports.AssessmentType = exports.ResourceType = exports.ContentType = exports.CourseLevel = exports.CourseCategory = exports.LearningStyle = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["STUDENT"] = "student";
    UserRole["INSTRUCTOR"] = "instructor";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var LearningStyle;
(function (LearningStyle) {
    LearningStyle["VISUAL"] = "visual";
    LearningStyle["AUDITORY"] = "auditory";
    LearningStyle["KINESTHETIC"] = "kinesthetic";
    LearningStyle["READING_WRITING"] = "reading_writing";
})(LearningStyle || (exports.LearningStyle = LearningStyle = {}));
var CourseCategory;
(function (CourseCategory) {
    CourseCategory["PROGRAMMING"] = "programming";
    CourseCategory["DATA_SCIENCE"] = "data_science";
    CourseCategory["DESIGN"] = "design";
    CourseCategory["BUSINESS"] = "business";
    CourseCategory["LANGUAGE"] = "language";
    CourseCategory["MATHEMATICS"] = "mathematics";
    CourseCategory["SCIENCE"] = "science";
    CourseCategory["ARTS"] = "arts";
    CourseCategory["OTHER"] = "other";
})(CourseCategory || (exports.CourseCategory = CourseCategory = {}));
var CourseLevel;
(function (CourseLevel) {
    CourseLevel["BEGINNER"] = "beginner";
    CourseLevel["INTERMEDIATE"] = "intermediate";
    CourseLevel["ADVANCED"] = "advanced";
    CourseLevel["EXPERT"] = "expert";
})(CourseLevel || (exports.CourseLevel = CourseLevel = {}));
var ContentType;
(function (ContentType) {
    ContentType["VIDEO"] = "video";
    ContentType["TEXT"] = "text";
    ContentType["INTERACTIVE"] = "interactive";
    ContentType["QUIZ"] = "quiz";
    ContentType["CODE"] = "code";
    ContentType["DOCUMENT"] = "document";
    ContentType["AUDIO"] = "audio";
})(ContentType || (exports.ContentType = ContentType = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["DOCUMENT"] = "document";
    ResourceType["VIDEO"] = "video";
    ResourceType["AUDIO"] = "audio";
    ResourceType["LINK"] = "link";
    ResourceType["DOWNLOAD"] = "download";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var AssessmentType;
(function (AssessmentType) {
    AssessmentType["QUIZ"] = "quiz";
    AssessmentType["TEST"] = "test";
    AssessmentType["ASSIGNMENT"] = "assignment";
    AssessmentType["PROJECT"] = "project";
    AssessmentType["PRACTICAL"] = "practical";
})(AssessmentType || (exports.AssessmentType = AssessmentType = {}));
var QuestionType;
(function (QuestionType) {
    QuestionType["MULTIPLE_CHOICE"] = "multiple_choice";
    QuestionType["TRUE_FALSE"] = "true_false";
    QuestionType["SHORT_ANSWER"] = "short_answer";
    QuestionType["ESSAY"] = "essay";
    QuestionType["CODE"] = "code";
    QuestionType["DRAG_DROP"] = "drag_drop";
    QuestionType["FILL_BLANK"] = "fill_blank";
})(QuestionType || (exports.QuestionType = QuestionType = {}));
var AnalyticsTimeframe;
(function (AnalyticsTimeframe) {
    AnalyticsTimeframe["DAILY"] = "daily";
    AnalyticsTimeframe["WEEKLY"] = "weekly";
    AnalyticsTimeframe["MONTHLY"] = "monthly";
    AnalyticsTimeframe["YEARLY"] = "yearly";
    AnalyticsTimeframe["ALL_TIME"] = "all_time";
})(AnalyticsTimeframe || (exports.AnalyticsTimeframe = AnalyticsTimeframe = {}));
var InsightType;
(function (InsightType) {
    InsightType["PERFORMANCE"] = "performance";
    InsightType["BEHAVIOR"] = "behavior";
    InsightType["PREFERENCE"] = "preference";
    InsightType["RECOMMENDATION"] = "recommendation";
    InsightType["WARNING"] = "warning";
    InsightType["ACHIEVEMENT"] = "achievement";
})(InsightType || (exports.InsightType = InsightType = {}));
var RecommendationType;
(function (RecommendationType) {
    RecommendationType["COURSE"] = "course";
    RecommendationType["LESSON"] = "lesson";
    RecommendationType["PRACTICE"] = "practice";
    RecommendationType["REVIEW"] = "review";
    RecommendationType["SKILL_BUILDING"] = "skill_building";
    RecommendationType["TIME_MANAGEMENT"] = "time_management";
})(RecommendationType || (exports.RecommendationType = RecommendationType = {}));
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "text";
    MessageType["IMAGE"] = "image";
    MessageType["FILE"] = "file";
    MessageType["CODE"] = "code";
    MessageType["SYSTEM"] = "system";
    MessageType["ANNOUNCEMENT"] = "announcement";
})(MessageType || (exports.MessageType = MessageType = {}));
var RoomType;
(function (RoomType) {
    RoomType["COURSE_GENERAL"] = "course_general";
    RoomType["COURSE_QA"] = "course_qa";
    RoomType["STUDY_GROUP"] = "study_group";
    RoomType["DIRECT_MESSAGE"] = "direct_message";
    RoomType["AI_TUTORING"] = "ai_tutoring";
})(RoomType || (exports.RoomType = RoomType = {}));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["SCHEDULED"] = "scheduled";
    SessionStatus["LIVE"] = "live";
    SessionStatus["ENDED"] = "ended";
    SessionStatus["CANCELLED"] = "cancelled";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
// Constants
exports.DEFAULT_PAGINATION_LIMIT = 20;
exports.MAX_PAGINATION_LIMIT = 100;
exports.MIN_PASSWORD_LENGTH = 8;
exports.MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
exports.SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
exports.SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
exports.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
//# sourceMappingURL=types.js.map