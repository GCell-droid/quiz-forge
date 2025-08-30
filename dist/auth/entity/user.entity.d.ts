export declare enum UserRole {
    STUDENT = "student",
    TEACHER = "teacher",
    ADMIN = "admin"
}
export declare class UserEntity {
    id: number;
    email: string;
    name: string;
    password: string;
    role: UserRole;
    createdAt: Date;
}
