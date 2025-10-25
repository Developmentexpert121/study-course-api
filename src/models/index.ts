import db from '../util/dbConn';
import Course from './course.model';
import Chapter from './chapter.model';
import Lesson from './lesson.model';
import Enrollment from './enrollment.model';
import User from './user.model';
import UserProgress from './userProgress.model';
import Mcq from './mcq.model';
import Ratings from './rating.model';

Course.hasMany(Chapter, {
  foreignKey: 'course_id',
  onDelete: 'CASCADE',
  as: 'chapters'
});

Chapter.belongsTo(Course, {
  foreignKey: 'course_id',
  as: 'course'
});

Chapter.hasMany(Lesson, {
  foreignKey: 'chapter_id',
  onDelete: 'CASCADE',
  as: 'lessons'
});

Lesson.belongsTo(Chapter, {
  foreignKey: 'chapter_id',
  as: 'chapter'
});

Course.hasMany(Enrollment, {
  foreignKey: 'course_id',
  onDelete: 'CASCADE'
});
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(Enrollment, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE'
});
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

Course.hasMany(UserProgress, { foreignKey: 'course_id' });
UserProgress.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(UserProgress, { foreignKey: 'user_id' });
UserProgress.belongsTo(User, { foreignKey: 'user_id' });

Chapter.hasMany(UserProgress, { foreignKey: 'chapter_id' });
UserProgress.belongsTo(Chapter, { foreignKey: 'chapter_id' });

Lesson.hasMany(UserProgress, { foreignKey: 'lesson_id' });
UserProgress.belongsTo(Lesson, { foreignKey: 'lesson_id' });

Course.hasMany(Mcq, { foreignKey: 'course_id' });
Mcq.belongsTo(Course, { foreignKey: 'course_id' });

Chapter.hasMany(Mcq, {
  foreignKey: 'chapter_id',
  as: 'mcqs'
});
Mcq.belongsTo(Chapter, {
  foreignKey: 'chapter_id',
  as: 'chapter'
});
User.hasMany(Course, { foreignKey: 'userId', as: 'courses' });

Course.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Ratings, { foreignKey: "user_id" });
Course.hasMany(Ratings, { foreignKey: "course_id" });

Ratings.belongsTo(User, { foreignKey: "user_id" });
Ratings.belongsTo(Course, { foreignKey: "course_id" });

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