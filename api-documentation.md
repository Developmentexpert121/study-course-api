# Study Course API Documentation

This document lists all the API endpoints for the Study Course API with detailed payloads. You can use this to create a Postman collection by importing this as a Markdown file or manually adding the endpoints.

Base URL: `http://localhost:5000` (adjust as per your environment)

## Authentication
Most endpoints require authentication. Use the `/user/login` endpoint to get a token, then include it in the Authorization header as `Bearer <token>`.

## Endpoints

### User Routes (`/user`)

#### GET `/user/admins` - Get all admins (Super Admin)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status ('all', 'approved', 'pending', 'rejected')
- `search` (optional): Search by username or email
- `email` (optional): Exact email filter
- `name` (optional): Exact username filter

**Response:**
```json
{
  "success": true,
  "data": {
    "admins": [
      {
        "id": 1,
        "username": "admin1",
        "email": "admin@example.com",
        "role": "admin",
        "verified": true,
        "profileImage": null,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "status": "approved",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "stats": {
      "totalAdmins": 5,
      "verifiedAdmins": 4,
      "unverifiedAdmins": 1
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 5,
      "itemsPerPage": 10
    }
  }
}
```

#### PUT `/user/admins/:id/approve` - Approve admin (Super Admin)
**Path Parameters:**
- `id`: Admin ID

**Response:**
```json
{
  "success": true,
  "message": "Admin approved successfully!",
  "data": {
    "emailSent": true
  }
}
```

#### PATCH `/user/admins/:id/reject` - Reject admin (Super Admin)
**Path Parameters:**
- `id`: Admin ID

**Request Body:**
```json
{
  "reason": "Optional rejection reason"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin application rejected successfully! Rejection email has been sent.",
  "data": {
    "emailSent": true
  }
}
```

#### GET `/user/get-all-details-admin` - Get all user details for admin (Super Admin)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term
- `filterType` (optional): 'all', 'name', 'email'
- `verifyUser` (optional): 'true' or 'false' for verification filter

**Response:**
```json
{
  "success": true,
  "currentPage": 1,
  "totalPages": 1,
  "totalUsers": 10,
  "activeUsers": 8,
  "inactiveUsers": 2,
  "filteredUsersCount": 10,
  "searchTerm": null,
  "filterType": "all",
  "users": [
    {
      "id": 1,
      "username": "user1",
      "status": "active",
      "verifyUser": true,
      "role": "user",
      "email": "user@example.com",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "profileImage": null,
      "enrolledCourses": [
        {
          "course_id": 1,
          "title": "Course Title",
          "image": "image.jpg",
          "total_chapters": 5,
          "completed_chapters": 3,
          "completion_percentage": 60
        }
      ]
    }
  ]
}
```

#### GET `/user/dashboard-stats` - Get dashboard stats (Super Admin)
**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "byRole": { "admin": 5, "user": 95 },
      "userVerification": { "verified": 80, "unverified": 20 },
      "adminStatus": { "approved": 4, "rejected": 1, "pending": 0 }
    },
    "chapters": { "total": 50 },
    "courses": { "total": 10, "active": 8, "inactive": 2, "draft": 0 },
    "certificates": { "total": 25 },
    "enrollments": { "total": 150 },
    "summary": {
      "totalUsers": 100,
      "totalAdmins": 5,
      "totalChapters": 50,
      "totalCourses": 10,
      "activeCourses": 8,
      "inactiveCourses": 2,
      "totalCertificates": 25,
      "totalEnrollments": 150
    }
  },
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

#### GET `/user/dashboard-stats/admin` - Get admin dashboard stats
**Response:**
```json
{
  "success": true,
  "data": {
    "total_courses": 10,
    "active_courses": 8,
    "inactive_courses": 2,
    "total_enrollments": 150,
    "courses_this_month": 2,
    "enrollments_this_month": 20,
    "courses_by_category": [
      { "category": "Programming", "count": "5" },
      { "category": "Design", "count": "3" }
    ]
  },
  "generated_at": "2023-01-01T00:00:00.000Z"
}
```

#### GET `/user/getCourseAuditLogs` - Get course audit logs
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sort_by` (optional): Sort field (default: 'action_timestamp')
- `sort_order` (optional): 'ASC' or 'DESC' (default: 'DESC')

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "admin_id": 1,
        "activity_type": "login",
        "created_at": "2023-01-01T00:00:00.000Z",
        "updated_at": "2023-01-01T00:00:00.000Z",
        "username": "admin1",
        "email": "admin@example.com",
        "role": "admin"
      }
    ],
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

#### GET `/user/courses/:id` - Get course by ID
**Path Parameters:**
- `id`: Course ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Course Title",
    "description": "Course description",
    "category": "Programming",
    "is_active": true,
    "image": "image.jpg",
    "intro_video": "video.mp4",
    "creator": "Creator Name",
    "price": 99.99,
    "price_type": "paid",
    "duration": "4 weeks",
    "status": "active",
    "ratings": 4.5,
    "userId": 1,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/user/chapters/course/:courseId` - Get chapters by course ID
**Path Parameters:**
- `courseId`: Course ID

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "title": "Chapter 1",
      "description": "Chapter description",
      "order": 1,
      "duration": 120,
      "course_id": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "lessons": [
        {
          "id": 1,
          "title": "Lesson 1",
          "duration": 60,
          "order": 1,
          "is_preview": false
        }
      ],
      "mcqs": [
        {
          "id": 1,
          "question": "Sample question?"
        }
      ]
    }
  ]
}
```

#### GET `/user/:userId/getinfo` - Get user info by ID
**Path Parameters:**
- `userId`: User ID

**Response:**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "role": "user",
    "verified": true,
    "profileImage": null,
    "bio": "User bio",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/user/:userId/courses` - Get courses by user ID
**Path Parameters:**
- `userId`: User ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `status` (optional): 'active', 'inactive', or 'all' (default: 'active')
- `search` (optional): Search term

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "description": "Course description",
      "category": "Programming",
      "is_active": true,
      "image": "image.jpg",
      "creator": "Creator Name",
      "price": 99.99,
      "price_type": "paid",
      "duration": "4 weeks",
      "status": "active",
      "ratings": 4.5,
      "userId": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "filters": {
    "availableCategories": ["Programming", "Design"],
    "totalActive": 1,
    "totalInactive": 0
  }
}
```

#### GET `/user/getlogs` - Get admin activity logs (Admin)
**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "admin_id": 1,
        "activity_type": "login",
        "created_at": "2023-01-01T00:00:00.000Z",
        "updated_at": "2023-01-01T00:00:00.000Z",
        "username": "admin1",
        "email": "admin@example.com",
        "role": "admin"
      }
    ],
    "totalCount": 1,
    "currentPage": 1,
    "totalPages": 1,
    "hasMore": false
  }
}
```

#### POST `/user/signup` - User signup
**Request Body:**
```json
{
  "username": "user1",
  "email": "user@example.com",
  "password": "password123",
  "role": "user" // optional, defaults to "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully! Please check your email to verify your account."
}
```

#### POST `/user/login` - User login
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "user" // optional
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "role": "user"
  },
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

#### POST `/user/forgot-password` - Forgot password
**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Forgot password email has been sent"
}
```

#### POST `/user/reset-password` - Reset password
**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "new_password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST `/user/verify` - Verify user
**Request Body:**
```json
{
  "token": "verification_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account verified successfully!",
  "accessToken": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### POST `/user/refresh-token` - Refresh token
**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "new_jwt_token_here"
}
```

#### POST `/user/logout` - Logout
**Request Body:**
```json
{
  "admin_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout activity recorded successfully",
  "activity": {
    "id": 1,
    "admin_id": 1,
    "activity_type": "logout",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

#### POST `/user/deactivate` - Deactivate user
**Request Body:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account has been deactivated successfully",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "status": "inactive"
  }
}
```

#### POST `/user/activateUser` - Activate user
**Request Body:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User account has been activated successfully",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "status": "active"
  }
}
```

#### GET `/user/` - Get all users (Admin)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "user1",
      "email": "user@example.com",
      "role": "user",
      "verified": true,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET `/user/stats` - Get user stats (Admin)
**Response:**
```json
{
  "success": true,
  "monthly": [
    {
      "month": "2023-01",
      "count": 10
    }
  ],
  "yearly": [
    {
      "year": 2023,
      "count": 120
    }
  ]
}
```

#### GET `/user/summary` - Get dashboard summary (Admin)
**Response:**
```json
{
  "success": true,
  "totalUsers": 100,
  "verifiedUsers": 80,
  "adminUsers": 5,
  "activeCourses": 10,
  "inactiveCourses": 2,
  "enrolledCourses": 150
}
```

#### GET `/user/get-all-details` - Get all user details (Admin)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "currentPage": 1,
  "totalPages": 1,
  "totalUsers": 1,
  "users": [
    {
      "id": 1,
      "username": "user1",
      "status": "active",
      "verifyUser": true,
      "role": "user",
      "email": "user@example.com",
      "enrolledCourses": [
        {
          "course_id": 1,
          "title": "Course Title",
          "image": "image.jpg",
          "total_chapters": 5,
          "completed_chapters": 3,
          "completion_percentage": 60
        }
      ]
    }
  ]
}
```

#### GET `/user/details/:id` - Get user details by ID (Admin)
**Path Parameters:**
- `id`: User ID

**Response:**
```json
{
  "success": true,
  "id": 1,
  "username": "user1",
  "email": "user@example.com",
  "verified": true,
  "role": "user",
  "joinedAt": "2023-01-01T00:00:00.000Z",
  "courses": [
    {
      "course_id": 1,
      "title": "Course Title",
      "image": "image.jpg",
      "enrolledAt": "2023-01-01T00:00:00.000Z",
      "total_chapters": 5,
      "completed_chapters": 3,
      "completion_percentage": 60,
      "chapters": [
        {
          "chapter_id": 1,
          "title": "Chapter 1",
          "order": 1,
          "completed": true,
          "completedAt": "2023-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "quizzes": [],
  "comments": [
    {
      "id": 1,
      "text": "Great course!",
      "course": {
        "id": 1,
        "title": "Course Title"
      },
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "ratings": [
    {
      "id": 1,
      "course": {
        "id": 1,
        "title": "Course Title"
      },
      "score": 5,
      "review": "Excellent course",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

#### GET `/user/me` - Get current user
**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "User profile fetched successfully",
  "user": {
    "id": 1,
    "username": "user1",
    "email": "user@example.com",
    "role": "user",
    "verified": true,
    "status": "active",
    "profileImage": null,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/user/admin/:adminId` - Get admin course stats
**Path Parameters:**
- `adminId`: Admin ID

**Response:**
```json
{
  "success": true,
  "data": {
    "total_courses": 5,
    "total_active_courses": 4,
    "total_enrollments": 50,
    "total_users_completed": 30,
    "all_courses": [
      {
        "id": 1,
        "title": "Course Title",
        "subtitle": "Course Subtitle",
        "category": "Programming",
        "price": 99.99,
        "image": "image.jpg",
        "ratings": 4.5,
        "status": "active",
        "is_active": true,
        "createdAt": "2023-01-01T00:00:00.000Z",
        "enrollment_count": 10,
        "completion_count": 7
      }
    ],
    "top_3_courses": [
      {
        "id": 1,
        "title": "Course Title",
        "enrollment_count": 10,
        "completion_count": 7
      }
    ]
  }
}
```

#### PUT `/user/:userId/profile` - Update user profile (with file upload)
**Path Parameters:**
- `userId`: User ID

**Request Body (form-data):**
- `username` (optional): New username
- `bio` (optional): New bio
- `profileImage` (optional): Image file

**Response:**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "id": 1,
    "username": "updated_user1",
    "email": "user@example.com",
    "role": "user",
    "verified": true,
    "profileImage": "profile_image_filename.jpg",
    "bio": "Updated bio",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### Course Routes (`/course`)

#### GET `/course/list` - List courses (Authenticated)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `search` (optional): Search term
- `sortBy` (optional): Sort field ('title', 'createdAt', 'ratings') (default: 'createdAt')
- `sortOrder` (optional): 'ASC' or 'DESC' (default: 'DESC')

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "description": "Course description",
      "category": "Programming",
      "is_active": true,
      "image": "image.jpg",
      "creator": "Creator Name",
      "price": 99.99,
      "price_type": "paid",
      "duration": "4 weeks",
      "status": "active",
      "ratings": 4.5,
      "userId": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "filters": {
    "availableCategories": ["Programming", "Design"],
    "totalActive": 1,
    "totalInactive": 0
  }
}
```

#### GET `/course/admin/all-courses` - Get all courses for admin (Admin)
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): 'active', 'inactive', or 'all' (default: 'all')
- `category` (optional): Filter by category
- `search` (optional): Search term

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "description": "Course description",
      "category": "Programming",
      "is_active": true,
      "image": "image.jpg",
      "creator": "Creator Name",
      "price": 99.99,
      "price_type": "paid",
      "duration": "4 weeks",
      "status": "active",
      "ratings": 4.5,
      "userId": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z",
      "enrollment_count": 10,
      "completion_count": 7
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "stats": {
    "totalCourses": 10,
    "activeCourses": 8,
    "inactiveCourses": 2,
    "totalEnrollments": 150
  }
}
```

#### GET `/course/courses` - List courses for users
**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `category` (optional): Filter by category
- `search` (optional): Search term
- `sortBy` (optional): Sort field ('title', 'ratings', 'price') (default: 'ratings')
- `sortOrder` (optional): 'ASC' or 'DESC' (default: 'DESC')

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "description": "Course description",
      "category": "Programming",
      "is_active": true,
      "image": "image.jpg",
      "creator": "Creator Name",
      "price": 99.99,
      "price_type": "paid",
      "duration": "4 weeks",
      "status": "active",
      "ratings": 4.5,
      "userId": 1,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "filters": {
    "availableCategories": ["Programming", "Design"],
    "totalActive": 1,
    "totalInactive": 0
  }
}
```

#### GET `/course/:id` - Get course by ID
**Path Parameters:**
- `id`: Course ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Course Title",
    "description": "Course description",
    "category": "Programming",
    "is_active": true,
    "image": "image.jpg",
    "intro_video": "video.mp4",
    "creator": "Creator Name",
    "price": 99.99,
    "price_type": "paid",
    "duration": "4 weeks",
    "status": "active",
    "ratings": 4.5,
    "userId": 1,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/course/:id/full-details` - Get course with full details
**Path Parameters:**
- `id`: Course ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Course Title",
    "description": "Course description",
    "category": "Programming",
    "is_active": true,
    "image": "image.jpg",
    "intro_video": "video.mp4",
    "creator": "Creator Name",
    "price": 99.99,
    "price_type": "paid",
    "duration": "4 weeks",
    "status": "active",
    "ratings": 4.5,
    "userId": 1,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "chapters": [
      {
        "id": 1,
        "title": "Chapter 1",
        "description": "Chapter description",
        "order": 1,
        "duration": 120,
        "lessons": [
          {
            "id": 1,
            "title": "Lesson 1",
            "content": "Lesson content",
            "duration": 60,
            "order": 1,
            "is_preview": false
          }
        ],
        "mcqs": [
          {
            "id": 1,
            "question": "Sample question?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A"
          }
        ]
      }
    ]
  }
}
```

#### PUT `/course/:id` - Update course
**Path Parameters:**
- `id`: Course ID

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "description": "Updated description",
  "category": "Updated Category",
  "price": 149.99,
  "duration": "6 weeks",
  "image": "new_image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Course Title",
    "description": "Updated description",
    "category": "Updated Category",
    "is_active": true,
    "image": "new_image.jpg",
    "price": 149.99,
    "duration": "6 weeks",
    "status": "active",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/course/:id/status` - Toggle course status (Admin)
**Path Parameters:**
- `id`: Course ID

**Response:**
```json
{
  "success": true,
  "message": "Course status updated successfully",
  "data": {
    "id": 1,
    "status": "inactive",
    "is_active": false,
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### GET `/course/continue-learning/:userId` - Get continue learning courses
**Path Parameters:**
- `userId`: User ID

**Query Parameters:**
- `limit` (optional): Number of courses to return (default: 5)

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "image": "image.jpg",
      "last_accessed": "2023-01-01T00:00:00.000Z",
      "progress_percentage": 60,
      "next_lesson": {
        "id": 2,
        "title": "Lesson 2"
      }
    }
  ]
}
```

#### GET `/course/with-progress/:userId` - List courses with progress
**Path Parameters:**
- `userId`: User ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "image": "image.jpg",
      "enrolledAt": "2023-01-01T00:00:00.000Z",
      "total_chapters": 5,
      "completed_chapters": 3,
      "progress_percentage": 60,
      "last_completed_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10
  }
}
```

#### GET `/course/:courseId/chapters-with-progress` - Get chapters with user progress
**Path Parameters:**
- `courseId`: Course ID

**Response:**
```json
{
  "success": true,
  "chapters": [
    {
      "id": 1,
      "title": "Chapter 1",
      "order": 1,
      "total_lessons": 3,
      "completed_lessons": 2,
      "progress_percentage": 67,
      "is_locked": false,
      "lessons": [
        {
          "id": 1,
          "title": "Lesson 1",
          "is_completed": true,
          "completed_at": "2023-01-01T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

#### GET `/course/courses/active` - Get active courses for homepage
**Query Parameters:**
- `limit` (optional): Number of courses to return (default: 10)
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "description": "Course description",
      "category": "Programming",
      "image": "image.jpg",
      "price": 99.99,
      "ratings": 4.5,
      "enrollment_count": 100
    }
  ]
}
```

#### GET `/course/users/:userId/enrolled-courses` - Get user enrolled courses
**Path Parameters:**
- `userId`: User ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "courses": [
    {
      "id": 1,
      "title": "Course Title",
      "image": "image.jpg",
      "enrolledAt": "2023-01-01T00:00:00.000Z",
      "progress_percentage": 60,
      "status": "in_progress"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalCourses": 1,
    "coursesPerPage": 10
  }
}
```

#### GET `/course/courses/:courseId/enrolled-users` - Get enrolled users for course
**Path Parameters:**
- `courseId`: Course ID

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "user1",
      "email": "user@example.com",
      "enrolledAt": "2023-01-01T00:00:00.000Z",
      "progress_percentage": 60,
      "status": "active"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalUsers": 1,
    "usersPerPage": 10
  }
}
```

#### DELETE `/course/:id` - Delete course (Admin)
**Path Parameters:**
- `id`: Course ID

**Response:**
```json
{
  "success": true,
  "message": "Course deleted successfully"
}
```

#### POST `/course/create-course` - Create course (Admin)
**Request Body:**
```json
{
  "title": "New Course Title",
  "description": "Course description",
  "category": "Programming",
  "price": 99.99,
  "price_type": "paid",
  "duration": "4 weeks",
  "image": "image.jpg",
  "intro_video": "video.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "id": 1,
    "title": "New Course Title",
    "description": "Course description",
    "category": "Programming",
    "is_active": true,
    "image": "image.jpg",
    "price": 99.99,
    "duration": "4 weeks",
    "status": "active",
    "userId": 1,
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### Enrollment Routes (`/enroll`)
- **POST** `/enroll/` - Enroll in course
- **GET** `/enroll/` - Get my enrolled courses
- **GET** `/enroll/course/status` - Get enrollment status
- **DELETE** `/enroll/course/unenroll` - Unenroll from course

### Chapter Routes (`/chapter`)
- **GET** `/chapter/course` - Get chapters by course (paginated)
- **GET** `/chapter/next` - Get next chapter
- **GET** `/chapter/allchapters` - Get all chapters simple
- **GET** `/chapter/navigation/chapter-navigation` - Get chapter navigation
- **GET** `/chapter/:id` - Get chapter by ID
- **GET** `/chapter/` - Get chapters by course ID
- **GET** `/chapter/get-all-chapters` - Get all chapters
- **POST** `/chapter/` - Create chapter (Admin)
- **DELETE** `/chapter/:id` - Delete chapter (Admin)
- **PUT** `/chapter/:id` - Edit chapter

### Lesson Routes (`/lessons`)
- **POST** `/lessons/` - Create lesson
- **GET** `/lessons/` - Get all lessons
- **GET** `/lessons/:id` - Get lesson by ID
- **PUT** `/lessons/:id` - Update lesson
- **DELETE** `/lessons/:id` - Delete lesson
- **PATCH** `/lessons/:id/toggle-status` - Toggle lesson status
- **GET** `/lessons/chapter/lessons` - Get lessons by chapter ID
- **GET** `/lessons/chapter/lessons/paginated` - Get lessons by chapter ID (paginated)
- **POST** `/lessons/progress/:courseId/lessons/:lessonId/complete` - Mark lesson as completed
- **GET** `/lessons/navigation/next` - Get next lesson
- **GET** `/lessons/navigation/detailed` - Get lesson navigation
- **GET** `/lessons/progress/chapter` - Get chapter lessons with progress

### Upload Routes (`/upload`)
- **POST** `/upload/` - Upload file
- **POST** `/upload/update-profile-image` - Update profile image
- **GET** `/upload/:userId` - Get user profile image

### Comment Routes (`/comment`)
- **POST** `/comment/:courseId` - Add comment
- **GET** `/comment/:courseId` - Get comments by course (Admin)
- **PUT** `/comment/:commentId` - Update comment
- **DELETE** `/comment/:commentId` - Delete comment

### Category Routes (`/categories`)
- **POST** `/categories/` - Create category
- **GET** `/categories/` - Get categories
- **GET** `/categories/:id` - Get category by ID
- **PUT** `/categories/:id` - Update category
- **DELETE** `/categories/:id` - Delete category

### Progress Routes (`/progress`)
- **POST** `/progress/:courseId/complete-lesson` - Mark lesson as completed
- **POST** `/progress/:courseId/submit-mcq` - Submit MCQ answers
- **GET** `/progress/:courseId/progress` - Get user course progress
- **GET** `/progress/:courseId/chapters/:chapterId/status` - Get chapter status
- **GET** `/progress/:courseId/debug-progress` - Debug user progress

### Learning Paths Routes (`/learning-paths`)
- **GET** `/learning-paths/` - Get learning paths
- **GET** `/learning-paths/:id` - Get learning path by ID
- **POST** `/learning-paths/` - Create learning path
- **PUT** `/learning-paths/:id` - Update learning path
- **DELETE** `/learning-paths/:id` - Delete learning path
- **GET** `/learning-paths/user/recommended` - Get recommended paths

### Wishlist Routes (`/wishlist`)
- **POST** `/wishlist/add` - Add to wishlist
- **POST** `/wishlist/remove` - Remove from wishlist
- **GET** `/wishlist/user/:user_id` - Get user wishlist
- **GET** `/wishlist/check` - Check wishlist status
- **GET** `/wishlist/count/:user_id` - Get wishlist count

### Certificate Routes (`/certificate`)
- **GET** `/certificate/admin/courses/:courseId/enrolled-users` - Get enrolled users with progress (Admin)
- **POST** `/certificate/admin/courses/:courseId/users/:userId/generate-certificate` - Generate certificate (Admin)
- **POST** `/certificate/admin/certificates/:certificateId/send-email` - Send certificate email (Admin)
- **POST** `/certificate/admin/certificates/:certificateId/revoke` - Revoke certificate (Admin)
- **POST** `/certificate/admin/certificates/:certificateId/reinstate` - Reinstate certificate (Admin)
- **POST** `/certificate/admin/certificates/bulk-actions` - Bulk certificate actions (Admin)
- **GET** `/certificate/user/:user_id` - Get user certificates
- **GET** `/certificate/verify/:code` - Verify certificate
- **POST** `/certificate/:id/download` - Download certificate
- **GET** `/certificate/admin/all` - Get all certificates (Super Admin)
- **GET** `/certificate/admin/stats` - Get certificate stats (Super Admin)
- **GET** `/certificate/stats/overview` - Get certificate stats overview (Admin)
- **POST** `/certificate/admin/create` - Manually create certificate (Super Admin)

### Rating Routes (`/rating`)
- **GET** `/rating/public/home-ratings` - Get public ratings
- **GET** `/rating/` - Get all ratings (Admin/Super Admin)
- **GET** `/rating/course/:courseId` - Get ratings by course (Admin/Super Admin)
- **GET** `/rating/course/:course_id/user` - Get rating by user and course
- **GET** `/rating/course/:course_id/details` - Get course ratings with user rating
- **POST** `/rating/` - Create rating
- **PATCH** `/rating/:id` - Edit user review
- **PATCH** `/rating/:ratingId/hide` - Hide rating (Admin/Super Admin)
- **PATCH** `/rating/:ratingId/unhide` - Unhide rating (Admin/Super Admin)
- **PATCH** `/rating/:ratingId/hide-review` - Hide review (Admin/Super Admin)
- **PATCH** `/rating/:ratingId/unhide-review` - Unhide review (Admin/Super Admin)
- **DELETE** `/rating/user/:ratingId` - Delete user rating
- **DELETE** `/rating/:ratingId` - Delete rating (Admin/Super Admin)

### Email Routes (`/email`)
- **POST** `/email/emails` - Store email
- **GET** `/email/emails` - Get all emails
- **POST** `/email/emails/bulk-send-batch` - Send bulk email batch

### MCQ Routes (`/mcq`)
- **GET** `/mcq/` - Get MCQs
- **POST** `/mcq/sumbitmcq` - Submit MCQ answers
- **POST** `/mcq/sumbit` - Submit MCQ and unlock next
- **GET** `/mcq/course-chapters-status` - Get user course MCQ status
- **GET** `/mcq/course/:course_id/` - Get MCQs by course ID
- **GET** `/mcq/student/chapter/:chapter_id` - Get student MCQs by chapter ID
- **POST** `/mcq/submit-all` - Submit all MCQ answers
- **GET** `/mcq/submissions` - Get user MCQ submissions
- **GET** `/mcq/best-submission` - Get user best submission
- **GET** `/mcq/chapter-stats` - Get chapter stats
- **GET** `/mcq/getStudentMcqsWithPrevious` - Get student MCQs with previous
- **GET** `/mcq/:id` - Get MCQ by ID
- **POST** `/mcq/create-mcq` - Create MCQ (Admin)
- **PUT** `/mcq/:id` - Update MCQ (Admin)
- **PUT** `/mcq/:id/status` - Toggle MCQ status (Admin)
- **DELETE** `/mcq/:id` - Delete MCQ (Admin)
- **GET** `/mcq/course/:course_id/passed` - Get passed MCQs by course
- **GET** `/mcq/complete-details/:user_id` - Get user complete details

### Static Routes
- **GET** `/uploads/*` - Serve uploaded files

## Notes
- Authentication is required for most endpoints. Use JWT tokens obtained from `/user/login`.
- Admin and Super Admin roles have additional permissions.
- Some endpoints require specific parameters in the request body or query params.
- For file uploads, use multipart/form-data.
