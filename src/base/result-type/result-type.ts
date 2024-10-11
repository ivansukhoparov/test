export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

export interface DomainError {
  message: string;
}

export class SessionNotFoundError implements DomainError {
  message = 'Session not found.';
}

export class ForbiddenError implements DomainError {
  message = 'You do not have permission to delete this session.';
}
