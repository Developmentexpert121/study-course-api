import db from '../util/dbConn';
import Course from './course.model';
import Chapter from './chapter.model';
import Lesson from './lesson.model';
import Enrollment from './enrollment.model';
import User from './user.model';
import UserProgress from './userProgress.model';
import Mcq from './mcq.model';
import Ratings from './rating.model';
import Wishlist from './wishlist.model';
import LearningPath from './learningPath.model';
import Certificate from './certificate.model'
import Role from './role.model';

// Course Associations
Course.hasMany(Chapter, {
  foreignKey: 'course_id',
  onDelete: 'CASCADE',
  as: 'chapters'
});

Chapter.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

// Chapter-Lesson Associations
Chapter.hasMany(Lesson, {
  foreignKey: 'chapter_id',
  onDelete: 'CASCADE',
  as: 'lessons'
});

Lesson.belongsTo(Chapter, {
  foreignKey: 'chapter_id',
  as: 'chapter'
});

// Enrollment Associations
Course.hasMany(Enrollment, {
  foreignKey: 'course_id',
  onDelete: 'CASCADE',
  as: 'enrollments'
});
Enrollment.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

User.hasMany(Enrollment, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'enrollments'
});
Enrollment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// UserProgress Associations
Course.hasMany(UserProgress, {
  foreignKey: 'course_id',
  as: 'user_progress'
});
UserProgress.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

User.hasMany(UserProgress, {
  foreignKey: 'user_id',
  as: 'user_progress'
});
UserProgress.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Chapter.hasMany(UserProgress, {
  foreignKey: 'chapter_id',
  as: 'user_progress'
});
UserProgress.belongsTo(Chapter, {
  foreignKey: 'chapter_id',
  as: 'chapter'
});

Lesson.hasMany(UserProgress, {
  foreignKey: 'lesson_id',
  as: 'user_progress'
});
UserProgress.belongsTo(Lesson, {
  foreignKey: 'lesson_id',
  as: 'lesson'
});

// MCQ Associations
Chapter.hasMany(Mcq, {
  foreignKey: 'chapter_id',
  as: 'mcqs'
});
Mcq.belongsTo(Chapter, {
  foreignKey: 'chapter_id',
  as: 'chapter'
});
Course.hasMany(Mcq, {
  foreignKey: 'course_id',
  as: 'mcqs'
});

Mcq.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

// User-Course Associations
User.hasMany(Course, {
  foreignKey: 'userId',
  as: 'courses'
});

Course.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Ratings Associations
User.hasMany(Ratings, {
  foreignKey: "user_id",
  as: "user_ratings"
});
Course.hasMany(Ratings, {
  foreignKey: "course_id",
  as: "course_ratings"
});

Ratings.belongsTo(User, {
  foreignKey: "user_id",
  as: "rating_user" // Changed alias to avoid conflict
});
Ratings.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'rating_course' // Changed alias to avoid conflict
});

// Wishlist Associations
User.hasMany(Wishlist, {
  foreignKey: 'user_id',
  as: 'wishlist'
});
Wishlist.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'wishlist_user' // Changed alias to avoid conflict
});

Course.hasMany(Wishlist, {
  foreignKey: 'course_id',
  as: 'wishlisted_by'
});
Wishlist.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'wishlist_course' // Changed alias to avoid conflict
});

// Learning Path Associations
LearningPath.belongsToMany(Course, {
  through: 'LearningPathCourses',
  as: 'courses',
  foreignKey: 'learning_path_id',
  otherKey: 'course_id'
});

Course.belongsToMany(LearningPath, {
  through: 'LearningPathCourses',
  as: 'learningPaths',
  foreignKey: 'course_id',
  otherKey: 'learning_path_id'
});

// Certificate Associations - ONLY ONCE!
Certificate.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'certificate_user' // Unique alias
});

Certificate.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'certificate_course' // Unique alias
});

User.hasMany(Certificate, {
  foreignKey: 'user_id',
  as: 'certificates'
});

Course.hasMany(Certificate, {
  foreignKey: 'course_id',
  as: 'certificates'
});
// Add these to your existing associations
User.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'roleDetails'
});

Role.hasMany(User, {
  foreignKey: 'role_id',
  as: 'users'
});
export {
  db,
  Course,
  Chapter,
  Lesson,
  User,
  Enrollment,
  UserProgress,
  Mcq,
  Ratings,
  Certificate
};