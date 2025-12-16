/**
 * User validation utilities
 */

export interface User {
  id: string;
  email: string;
  age: number;
  role: 'admin' | 'user' | 'guest';
}

export const validateUser = (user: User): boolean => {
  // Check if user has email
  if (!user.email) {
    return false;
  }

  // Check email format
  if (!user.email.includes('@')) {
    return false;
  }

  // Check age
  if (user.age < 0 || user.age > 150) {
    return false;
  }

  // Check role
  if (user.role !== 'admin' && user.role !== 'user' && user.role !== 'guest') {
    return false;
  }

  return true;
};

export const validateUserBatch = (users: User[]): User[] => {
  const valid: User[] = [];
  for (let i = 0; i < users.length; i++) {
    if (validateUser(users[i])) {
      valid.push(users[i]);
    }
  }
  return valid;
};
