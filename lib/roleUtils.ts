import { User as FirebaseUser } from 'firebase/auth';
import { UserRole } from '../types';

/**
 * Safely extracts the user role from Firebase Custom Claims
 * This is READ-ONLY from the client side - claims can only be set via Firebase Admin SDK
 * @param firebaseUser - The authenticated Firebase user
 * @returns The user's role from custom claims, defaults to Farmer if not set
 */
export async function getUserRole(firebaseUser: FirebaseUser | null): Promise<UserRole> {
    if (!firebaseUser) {
        return UserRole.Farmer; // Default for unauthenticated users
    }

    try {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const claimRole = idTokenResult.claims.role as string | undefined;

        // Validate and return the role from claims
        if (claimRole && Object.values(UserRole).includes(claimRole as UserRole)) {
            return claimRole as UserRole;
        }

        // Default to Farmer if no valid claim is found
        return UserRole.Farmer;
    } catch (error) {
        console.error('Error fetching user role from custom claims:', error);
        return UserRole.Farmer;
    }
}

/**
 * Checks if the user has a specific role
 * @param firebaseUser - The authenticated Firebase user
 * @param role - The role to check for
 * @returns True if user has the specified role
 */
export async function hasRole(firebaseUser: FirebaseUser | null, role: UserRole): Promise<boolean> {
    const userRole = await getUserRole(firebaseUser);
    return userRole === role;
}

/**
 * Gets a human-readable role display name
 * @param role - The user role
 * @returns Display name for the role
 */
export function getRoleDisplayName(role: UserRole): string {
    switch (role) {
        case UserRole.Farmer:
            return 'Farmer';
        case UserRole.Supplier:
            return 'Supplier';
        case UserRole.Admin:
            return 'Admin';
        case UserRole.AgentPro:
            return 'Agent Pro';
        case UserRole.Agent:
            return 'Agent';
        default:
            return 'User';
    }
}

/**
 * Determines the default landing route for a given role
 * @param role - The user role
 * @returns The default route path
 */
export function getDefaultRouteForRole(role: UserRole): string {
    switch (role) {
        case UserRole.AgentPro:
            return '/agent-pro/dashboard';
        case UserRole.Agent:
            return '/agent/dashboard';
        case UserRole.Farmer:
            return '/farmer/dashboard';
        case UserRole.Supplier:
            return '/supplier/dashboard';
        case UserRole.Admin:
            return '/admin/dashboard';
        default:
            return '/';
    }
}
