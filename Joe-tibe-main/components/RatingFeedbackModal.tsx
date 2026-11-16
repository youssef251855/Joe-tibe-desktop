import React, { useState, useEffect } from 'react';
import type { AppReview, ReviewStats } from '../types';

export const RatingFeedbackModal: React.FC = () => {
    const [userRating, setUserRating] = useState<number>(5);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [name, setName] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [reviews, setReviews] = useState<AppReview[]>([]);
    const [stats, setStats] = useState<ReviewStats>({ total: 0, average: 5.0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<'latest' | 'top' | 'liked'>('latest');

    const availableTags = [
        'بدون إعلانات 🚫',
        'فائق السرعة ⚡',
        'إنستغرام & تيك توك 🎬',
        'فويس MP3 نقي 🎵',
        'تحميل دفعي وقوائم تشغيل 📁',
        'خفيف وسلس 📱'
    ];

    const fetchRealReviews = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/reviews');
            const resText = await res.text();
            let data: any = null;
            try {
                data = JSON.parse(resText);
            } catch {
                console.warn("Invalid JSON in reviews");
            }

            if (data && Array.isArray(data.reviews)) {
                setReviews(data.reviews);
                if (data.stats) {
                    setStats(data.stats);
                }
            }
        } catch (err) {
            console.error("Error fetching reviews:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRealReviews();
        try {
            const savedLiked = JSON.parse(localStorage.getItem('joetube_liked_reviews') || '[]');
            if (Array.isArray(savedLiked)) setLikedReviewIds(savedLiked);
        } catch {}
    }, []);

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!comment.trim() && selectedTags.length === 0) {
            setErrorMsg('يرجى كتابة تعليق أو اختيار وسم واحد على الأقل.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: name.trim() || 'مستخدم Joe tube',
                    rating: userRating,
                    comment: comment.trim(),
                    tags: selectedTags
                })
            });

            const resText = await res.text();
            let data: any = null;
            try {
                data = JSON.parse(resText);
            } catch {
                throw new Error("استجابة غير صالحة من الخادم");
            }

            if (!res.ok || data.error) {
                throw new Error(data?.error || "فشل إرسال التقييم");
            }

            if (data.review) {
                setReviews(prev => [data.review, ...prev]);
                if (data.stats) setStats(data.stats);
                setIsSubmitted(true);
                setName('');
                setComment('');
                setSelectedTags([]);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التقييم، يرجى المحاولة ثانية.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async (reviewId: string) => {
        if (likedReviewIds.includes(reviewId)) return;

        // Optimistic UI
        const updatedLiked = [...likedReviewIds, reviewId];
        setLikedReviewIds(updatedLiked);
        localStorage.setItem('joetube_liked_reviews', JSON.stringify(updatedLiked));

        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r));

        try {
            await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
        } catch (err) {
            console.error("Like error:", err);
        }
    };

    // Sort reviews
    const sortedReviews = [...reviews].sort((a, b) => {
        if (sortBy === 'top') return b.rating - a.rating;
        if (sortBy === 'liked') return (b.likes || 0) - (a.likes || 0);
        return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return (
        <div className="w-full animate-fade-in-up space-y-6 text-right">
            {/* Real Stats Banner */}
            <div className="bg-gradient-to-br from-yellow-400 via-[#fce116] to-amber-400 text-black p-5 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-black/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                            تقييمات المستخدمين الحقيقية
                        </span>
                        <span className="text-[11px] font-bold text-black/80">
                            {stats.total > 0 ? `${stats.total} تقييم مسجل` : 'نظام تقييم حي'}
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-5xl font-black">{stats.total > 0 ? stats.average.toFixed(1) : '5.0'}</span>
                            <div className="flex flex-col items-start">
                                <div className="flex text-black text-sm">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <i key={s} className={`fa-${(stats.total > 0 ? stats.average : 5) >= s ? 'solid' : 'regular'} fa-star`}></i>
                                    ))}
                                </div>
                                <span className="text-[11px] font-bold text-black/80 mt-0.5">
                                    {stats.total > 0 ? `متوسط حسابي دقيق لـ ${stats.total} رأي حقيقي` : 'كن أول من يقيّم التطبيق'}
                                </span>
                            </div>
                        </div>

                        {/* Real Rating Distribution */}
                        {stats.total > 0 && (
                            <div className="w-full sm:w-48 space-y-1 text-[10px] font-bold">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = stats.distribution[star] || 0;
                                    const percent = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                                    return (
                                        <div key={star} className="flex items-center gap-1.5">
                                            <span className="w-4 text-left">{star}★</span>
                                            <div className="flex-grow bg-black/15 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-black h-full rounded-full transition-all duration-500" 
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                            <span className="w-6 text-right text-[9px] text-black/70">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Rating Submission Form */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-pen-nib text-yellow-500"></i>
                        <span>{isSubmitted ? 'تم استلام تقييمك الحقيقي بنجاح 🎉' : 'أضف تقييمك ورأيك الحقيقي'}</span>
                    </h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                    جميع التقييمات هنا حقيقية 100% ويتم حفظها مباشرة لتظهر للجميع بدون أي تزييف.
                </p>

                {errorMsg && (
                    <div className="bg-red-50 text-red-700 text-xs font-bold p-3 rounded-xl mb-3 flex items-center gap-2 border border-red-200">
                        <i className="fa-solid fa-circle-exclamation text-sm"></i>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {isSubmitted ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-2xl text-center text-xs font-bold border border-green-200 space-y-2">
                        <i className="fa-solid fa-circle-check text-2xl block text-green-600"></i>
                        <p>شكراً جزيلاً لمشاركتك! تم نشر تقييمك للجميع ويظهر الآن في قائمة الآراء الحقيقية بالأسفل.</p>
                        <button
                            onClick={() => setIsSubmitted(false)}
                            className="text-xs text-yellow-700 hover:text-yellow-800 underline font-extrabold mt-2 cursor-pointer"
                        >
                            إضافة تقييم آخر أو تعديل
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Interactive Star Selection */}
                        <div className="flex flex-col items-center justify-center py-2 bg-gray-50/80 rounded-2xl border border-gray-100">
                            <span className="text-[11px] font-bold text-gray-600 mb-1.5">اختر تقييمك بالنجوم:</span>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        type="button"
                                        key={star}
                                        onClick={() => setUserRating(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        className="text-2xl text-yellow-400 hover:scale-125 transition-transform p-1 cursor-pointer focus:outline-hidden"
                                        aria-label={`${star} نجوم`}
                                    >
                                        <i className={`fa-${(hoverRating || userRating) >= star ? 'solid' : 'regular'} fa-star`}></i>
                                    </button>
                                ))}
                            </div>
                            <span className="text-[11px] font-extrabold text-gray-700 mt-1">
                                {userRating === 5 ? 'ممتاز جداً 🌟🌟🌟🌟🌟' :
                                 userRating === 4 ? 'جيد جداً 🌟🌟🌟🌟' :
                                 userRating === 3 ? 'متوسط 🌟🌟🌟' :
                                 userRating === 2 ? 'بحاجة لتحسين 🌟🌟' : 'ضعيف 🌟'}
                            </span>
                        </div>

                        {/* Quick Tags */}
                        <div>
                            <span className="block text-[11px] font-bold text-gray-700 mb-2">ما أكثر ميزة أعجبتك؟ (اختياري)</span>
                            <div className="flex flex-wrap gap-1.5">
                                {availableTags.map(tag => {
                                    const isSelected = selectedTags.includes(tag);
                                    return (
                                        <button
                                            type="button"
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all border cursor-pointer
                                                ${isSelected 
                                                    ? 'bg-yellow-400 text-black border-yellow-500 scale-95 shadow-xs' 
                                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* User Inputs */}
                        <div className="space-y-2.5">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="اسمك أو لقبك (مثال: محمد، سارة، مستخدم أندرويد)..."
                                maxLength={50}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#fce116] focus:bg-white transition"
                            />
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder="اكتب تجربتك الحقيقية، سرعة التحميل، أو أي ميزة تود إضافتها في Joe tube..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#fce116] focus:bg-white resize-none transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#fce116] hover:bg-[#e5cc14] disabled:opacity-50 text-black font-extrabold py-3 rounded-2xl shadow-md shadow-yellow-500/20 transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    <span>جاري النشر...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-paper-plane"></i>
                                    <span>نشر التقييم الحقيقي</span>
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Real Reviews Stream */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-gray-900">سجل الآراء الحقيقية</h4>
                        <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {reviews.length}
                        </span>
                    </div>

                    {/* Filter / Sort dropdown */}
                    {reviews.length > 1 && (
                        <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-[10px] font-bold">
                            <button
                                onClick={() => setSortBy('latest')}
                                className={`px-2 py-1 rounded-lg transition ${sortBy === 'latest' ? 'bg-white text-black shadow-2xs' : 'text-gray-500'}`}
                            >
                                الأحدث
                            </button>
                            <button
                                onClick={() => setSortBy('top')}
                                className={`px-2 py-1 rounded-lg transition ${sortBy === 'top' ? 'bg-white text-black shadow-2xs' : 'text-gray-500'}`}
                            >
                                الأعلى نجوم
                            </button>
                            <button
                                onClick={() => setSortBy('liked')}
                                className={`px-2 py-1 rounded-lg transition ${sortBy === 'liked' ? 'bg-white text-black shadow-2xs' : 'text-gray-500'}`}
                            >
                                الأكثر إعجاباً
                            </button>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-yellow-500 mb-2 block"></i>
                        <span className="text-xs font-bold">جاري تحميل التقييمات الحقيقية...</span>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center text-xl mx-auto">
                            <i className="fa-solid fa-star-half-stroke"></i>
                        </div>
                        <h5 className="font-bold text-sm text-gray-800">لا توجد تقييمات مسجلة بعد</h5>
                        <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                            كن أول مستخدم حقيقي يضع تقييمه ورأيه الصادق في Joe tube عبر النموذج أعلاه!
                        </p>
                    </div>
                ) : (
                    sortedReviews.map((rev) => {
                        const isLiked = likedReviewIds.includes(rev.id);
                        return (
                            <div key={rev.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs text-right transition hover:border-yellow-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-[#fce116] flex items-center justify-center text-black font-extrabold text-xs shadow-2xs">
                                            {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h5 className="font-bold text-xs text-gray-900">{rev.userName}</h5>
                                                <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.2 rounded-md font-bold">
                                                    حقيقي ✓
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-400">
                                                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : rev.date || 'حديث'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex text-yellow-400 text-xs">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <i key={s} className={`fa-${rev.rating >= s ? 'solid' : 'regular'} fa-star`}></i>
                                        ))}
                                    </div>
                                </div>

                                {rev.comment && (
                                    <p className="text-xs text-gray-700 leading-relaxed mb-3 font-normal">
                                        {rev.comment}
                                    </p>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                    {rev.tags && rev.tags.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {rev.tags.map((t, i) => (
                                                <span key={i} className="bg-gray-50 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-gray-100">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    ) : <div></div>}

                                    {/* Like Button */}
                                    <button
                                        onClick={() => handleLike(rev.id)}
                                        disabled={isLiked}
                                        className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer
                                            ${isLiked 
                                                ? 'text-pink-600 bg-pink-50' 
                                                : 'text-gray-500 hover:text-pink-600 hover:bg-pink-50/50'}`}
                                        title={isLiked ? 'أعجبك هذا التقييم' : 'إعجاب بالتقييم'}
                                    >
                                        <i className={`fa-${isLiked ? 'solid' : 'regular'} fa-heart text-xs`}></i>
                                        <span>{rev.likes || 0}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
