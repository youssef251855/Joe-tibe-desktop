import fs from "fs/promises";
import path from "path";
import type { AppReview } from "../types";

export interface ReviewStats {
    total: number;
    average: number;
    distribution: { [key: number]: number };
}

const DATA_DIR = path.join(process.cwd(), "data");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews.json");

async function ensureDataFile(): Promise<void> {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(REVIEWS_FILE);
        } catch {
            // File does not exist, initialize with clean empty array (real user reviews only)
            await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2), "utf-8");
        }
    } catch (err) {
        console.error("Failed to ensure reviews file:", err);
    }
}

export async function getAllReviews(): Promise<{ reviews: AppReview[]; stats: ReviewStats }> {
    await ensureDataFile();
    try {
        const content = await fs.readFile(REVIEWS_FILE, "utf-8");
        const reviews: AppReview[] = JSON.parse(content || "[]");

        // Compute real statistics
        const total = reviews.length;
        const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sumRating = 0;

        reviews.forEach((r) => {
            const star = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
            distribution[star] = (distribution[star] || 0) + 1;
            sumRating += r.rating;
        });

        const average = total > 0 ? Number((sumRating / total).toFixed(1)) : 5.0;

        return {
            reviews,
            stats: {
                total,
                average,
                distribution
            }
        };
    } catch (err) {
        console.error("Error reading reviews:", err);
        return {
            reviews: [],
            stats: { total: 0, average: 5.0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
        };
    }
}

export async function saveNewReview(data: {
    userName: string;
    rating: number;
    comment: string;
    tags?: string[];
}): Promise<AppReview> {
    await ensureDataFile();
    const cleanRating = Math.max(1, Math.min(5, Number(data.rating) || 5));
    const cleanName = (data.userName || "").trim().slice(0, 50) || "مستخدم Joe tube";
    const cleanComment = (data.comment || "").trim().slice(0, 500);
    const cleanTags = Array.isArray(data.tags) ? data.tags.slice(0, 5).map(t => String(t).slice(0, 30)) : [];

    const newReview: AppReview = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userName: cleanName,
        rating: cleanRating,
        comment: cleanComment,
        date: "اليوم",
        createdAt: Date.now(),
        likes: 0,
        tags: cleanTags
    };

    try {
        const current = await getAllReviews();
        const updatedList = [newReview, ...current.reviews];
        await fs.writeFile(REVIEWS_FILE, JSON.stringify(updatedList, null, 2), "utf-8");
        return newReview;
    } catch (err) {
        console.error("Error saving review:", err);
        throw new Error("فشل حفظ التقييم على السيرفر");
    }
}

export async function toggleLikeReview(id: string): Promise<{ success: boolean; likes: number }> {
    await ensureDataFile();
    try {
        const current = await getAllReviews();
        let targetLikes = 0;
        let found = false;

        const updated = current.reviews.map((r) => {
            if (r.id === id) {
                found = true;
                const newLikes = (r.likes || 0) + 1;
                targetLikes = newLikes;
                return { ...r, likes: newLikes };
            }
            return r;
        });

        if (found) {
            await fs.writeFile(REVIEWS_FILE, JSON.stringify(updated, null, 2), "utf-8");
            return { success: true, likes: targetLikes };
        }
        return { success: false, likes: 0 };
    } catch (err) {
        console.error("Error liking review:", err);
        return { success: false, likes: 0 };
    }
}
