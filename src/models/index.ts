import db from '../util/dbConn';
import Course from './course.model';
import Chapter from './chapter.model';
import Enrollment from './enrollment.model';
import User from './user.model';
import UserProgress from './userProgress.model';
import Mcq from './mcq.model';
import Ratings from './rating.model';

Course.hasMany(Chapter, {
  foreignKey: 'course_id',
  onDelete: 'CASCADE', 
});

Chapter.belongsTo(Course, {
  foreignKey: 'course_id',
});

Course.hasMany(Enrollment, { foreignKey: 'course_id' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(Enrollment, { foreignKey: 'user_id' });
Enrollment.belongsTo(User, { foreignKey: 'user_id' });

Course.hasMany(UserProgress, { foreignKey: 'course_id' });
UserProgress.belongsTo(Course, { foreignKey: 'course_id' });

User.hasMany(UserProgress, { foreignKey: 'user_id' });
UserProgress.belongsTo(User, { foreignKey: 'user_id' });

Chapter.hasMany(UserProgress, { foreignKey: 'chapter_id' });
UserProgress.belongsTo(Chapter, { foreignKey: 'chapter_id' });

Course.hasMany(Mcq, { foreignKey: 'course_id' });
Mcq.belongsTo(Course, { foreignKey: 'course_id' });

Chapter.hasMany(Mcq, { foreignKey: 'chapter_id' });
Mcq.belongsTo(Chapter, { foreignKey: 'chapter_id' });

User.hasMany(Ratings, { foreignKey: "user_id" });
Course.hasMany(Ratings, { foreignKey: "course_id" });

Ratings.belongsTo(User, { foreignKey: "user_id" });
Ratings.belongsTo(Course, { foreignKey: "course_id" });

export {
  db,
  Course,
  Chapter,
  User,
  Enrollment,
  UserProgress,
  Mcq
};
