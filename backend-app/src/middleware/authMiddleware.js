import env from '../config/env.js';
import { verifyJWT } from '../utils/jwtHelper.js';

/**
 * Machine Authentication: Static API Key
 * Validates the x-api-key header for IoT ingestion endpoints.
 */
export function apiKeyAuth(req, res, next) {
  const clientKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!clientKey || clientKey !== env.API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid API Key' 
    });
  }
  
  next();
}

/**
 * Human Authentication: JWT
 * Validates the Authorization: Bearer <token> header for Dashboard endpoints.
 */
export function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Missing or invalid token format' 
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyJWT(token);
  
  if (!payload) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Token expired or invalid signature' 
    });
  }

  // Attach decoded user context to the request for downstream controllers
  req.user = payload; 
  next();
}
