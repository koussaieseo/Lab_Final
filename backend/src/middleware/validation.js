const Joi = require('joi');

const validationSchemas = {
  // User validation schemas
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required(),
    bio: Joi.string().max(500).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    bio: Joi.string().max(500).optional(),
    avatar: Joi.string().uri().optional()
  }),

  // Post validation schemas
  createPost: Joi.object({
    content: Joi.string().max(1000).required(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isPublic: Joi.boolean().optional()
  }),

  updatePost: Joi.object({
    content: Joi.string().max(1000).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isPublic: Joi.boolean().optional()
  }),

  // Comment validation schemas
  createComment: Joi.object({
    content: Joi.string().max(500).required(),
    parentComment: Joi.string().optional()
  }),

  updateComment: Joi.object({
    content: Joi.string().max(500).required()
  }),

  // Relationship validation schemas
  followUser: Joi.object({
    userId: Joi.string().required()
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Search validation
  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('users', 'posts', 'all').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
  }),

  // Media validation
  updateMedia: Joi.object({
    altText: Joi.string().max(200).optional()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        message: 'Query validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  validationSchemas,
  validate,
  validateQuery
};