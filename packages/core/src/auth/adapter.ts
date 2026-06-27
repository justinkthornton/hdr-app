export type AuthSubject = {
  id: string;
  displayName: string | null;
  roles: string[];
};

export interface AuthAdapter {
  getSubjectFromRequest(request: Request): Promise<AuthSubject | null>;
}

export class LocalPhaseOneAuthAdapter implements AuthAdapter {
  async getSubjectFromRequest(_request: Request): Promise<AuthSubject | null> {
    return null;
  }
}
