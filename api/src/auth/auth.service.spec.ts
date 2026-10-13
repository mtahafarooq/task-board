import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

interface UserRow {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let service: AuthService;

  const storedUser: UserRow = {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    passwordHash: 'not-used-here',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    service = new AuthService(
      prisma as unknown as PrismaService,
      new JwtService({
        secret: 'test-secret',
        signOptions: { expiresIn: '15m' },
      }),
    );
  });

  it('hashes the password and never returns it on register', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      async ({ data }: { data: Partial<UserRow> }) => ({
        ...storedUser,
        ...data,
      }),
    );

    const result = await service.register({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      password: 'supersecret',
    });

    const created = prisma.user.create.mock.calls[0][0].data as UserRow;
    expect(created.passwordHash).not.toBe('supersecret');
    expect(created.passwordHash.startsWith('$2')).toBe(true);
    await expect(
      bcrypt.compare('supersecret', created.passwordHash),
    ).resolves.toBe(true);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe('ada@example.com');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('rejects a duplicate email with a conflict', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser);

    await expect(
      service.register({
        email: storedUser.email,
        name: 'Ada',
        password: 'supersecret',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown email and a wrong password with the same error', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever' }),
    ).rejects.toThrow('Invalid email or password');

    const passwordHash = await bcrypt.hash('right-password', 4);
    prisma.user.findUnique.mockResolvedValue({ ...storedUser, passwordHash });
    await expect(
      service.login({ email: storedUser.email, password: 'wrong-password' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('issues an access token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('right-password', 4);
    prisma.user.findUnique.mockResolvedValue({ ...storedUser, passwordHash });

    const result = await service.login({
      email: storedUser.email,
      password: 'right-password',
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(typeof result.accessToken).toBe('string');
  });

  it('rejects refresh without a token', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns the public profile for a known user id', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser);

    const profile = await service.getProfile(storedUser.id);

    expect(profile).toMatchObject({
      id: storedUser.id,
      email: storedUser.email,
      name: storedUser.name,
    });
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('rejects the profile lookup when the user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getProfile('missing-user')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
