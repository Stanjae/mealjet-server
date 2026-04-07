import { env } from "@shared/config/env.js";
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Africa/Lagos');
export const newDayJs = () => dayjs();
export const cookieOptions = (maxAge, path) => {
    const COOKIE_OPTIONS = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge, //30 * 24 * 60 * 60 * 1000, // 30 days in ms
    };
    if (path) {
        return { ...COOKIE_OPTIONS, path };
    }
    return COOKIE_OPTIONS;
};
export const sanitizeToId = (doc) => {
    doc.id = doc._id;
    delete doc._id;
    delete doc.__v;
    return doc;
};
