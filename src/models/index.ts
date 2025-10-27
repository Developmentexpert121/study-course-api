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

// User-Course Associations
User.hasMany(Course, {
  foreignKey: 'userId',
  as: 'courses'
});

Course.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Ratings Associations - USE DIFFERENT ALIAS NAMES
User.hasMany(Ratings, {
  foreignKey: "user_id",
  as: "user_ratings" // Changed alias
});
Course.hasMany(Ratings, {
  foreignKey: "course_id",
  as: "course_ratings" // Changed alias
});

Ratings.belongsTo(User, {
  foreignKey: "user_id",
  as: "rating_user" // Changed alias
});
Ratings.belongsTo(Course, {
  foreignKey: "course_id",
  as: "rating_course" // Changed alias
});
User.hasMany(Wishlist, {
  foreignKey: 'user_id',
  as: 'wishlist'
});
Wishlist.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Course.hasMany(Wishlist, {
  foreignKey: 'course_id',
  as: 'wishlisted_by'
});
Wishlist.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

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

export {
  db,
  Course,
  Chapter,
  Lesson,
  User,
  Enrollment,
  UserProgress,
  Mcq,
  Ratings
};