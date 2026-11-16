import React from 'react';

export const SnapTubeVsJoeTube: React.FC = () => {
    const comparisons = [
        {
            feature: 'الإعلانات والنوافذ المزعجة',
            joetube: 'خالٍ تماماً من الإعلانات 0% Ads',
            snaptube: 'مليء بالإعلانات المنبثقة والفيديوهات الإجبارية',
            winner: 'joetube'
        },
        {
            feature: 'دعم أجهزة آيفون (iOS) والكمبيوتر',
            joetube: 'يعمل على كل الأجهزة والأنظمة + تثبيت PWA بنقرة',
            snaptube: 'غير متوفر للأيفون نهائياً (أندرويد فقط)',
            winner: 'joetube'
        },
        {
            feature: 'الأمان والخصوصية والصلاحيات',
            joetube: 'آمن 100% لا يطلب أي صلاحيات خطيرة لهاتفك',
            snaptube: 'ملف APK خارجي قد يشكل خطراً ويطلب صلاحيات مفرطة',
            winner: 'joetube'
        },
        {
            feature: 'تنزيل تيك توك بدون علامة مائية',
            joetube: 'مدعوم بأعلى دقة HD مع استخراج الفويس MP3',
            snaptube: 'غالباً يفشل في إزالة العلامة المائية',
            winner: 'joetube'
        },
        {
            feature: 'دعم إنستغرام وX (تويتر) وتيك توك',
            joetube: 'دعم فوري لريلز ومنشورات إنستغرام وفيديوهات X بدقة Full HD',
            snaptube: 'كثير الأعطال وتوقف مستمر مع تحديثات إنستغرام وتويتر',
            winner: 'joetube'
        },
        {
            feature: 'التحميل الدفعي وقوائم التشغيل (Batch)',
            joetube: 'لصق روابط متعددة أو قائمة تشغيل وتحميل الكل بنقرة واحدة',
            snaptube: 'تحميل يدوي فردي وبطيء يستهلك الوقت',
            winner: 'joetube'
        },
        {
            feature: 'استهلاك الذاكرة والمساحة',
            joetube: 'أقل من 1 ميجابايت (سحابي وخفيف جداً)',
            snaptube: 'أكثر من 80 - 150 ميجابايت وتحديثات مستمرة',
            winner: 'joetube'
        },
        {
            feature: 'تنزيل فويس وصوت التيك توك مباشرة',
            joetube: 'مشغل فويس مدمج واستماع وتنزيل سريع',
            snaptube: 'يتطلب تحويل معقد وخطوات إضافية',
            winner: 'joetube'
        }
    ];

    return (
        <div className="w-full animate-fade-in-up space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm text-right">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#fce116] flex items-center justify-center text-black font-bold text-lg shadow-sm">
                        👑
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-gray-900">لماذا Joe tube يتفوق على سناب تيوب؟</h3>
                        <p className="text-xs text-gray-500">مقارنة تقنية حقيقية بين Joe tube وتطبيق SnapTube</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {comparisons.map((c, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                            <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-check text-yellow-500 text-[11px]"></i>
                                {c.feature}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-right">
                                <div className="bg-yellow-100/70 border border-yellow-300 rounded-xl p-2">
                                    <span className="block text-[10px] font-black text-black mb-0.5">⚡ Joe tube:</span>
                                    <span className="text-[11px] font-bold text-yellow-900 leading-tight block">{c.joetube}</span>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-xl p-2 opacity-80">
                                    <span className="block text-[10px] font-bold text-red-700 mb-0.5">❌ SnapTube:</span>
                                    <span className="text-[10px] text-red-900 leading-tight block">{c.snaptube}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Summary Highlights */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-right">
                    <i className="fa-solid fa-shield-halved text-2xl text-green-500 mb-2 block"></i>
                    <h5 className="font-bold text-xs text-gray-900 mb-1">أمان مطلق 100%</h5>
                    <p className="text-[10px] text-gray-500">لا ملفات ضارة، لا تتبع لبياناتك الشخصية، واستخدام فوري بدون حساب.</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-right">
                    <i className="fa-solid fa-gauge-high text-2xl text-yellow-500 mb-2 block"></i>
                    <h5 className="font-bold text-xs text-gray-900 mb-1">تطبيق PWA خفيف</h5>
                    <p className="text-[10px] text-gray-500">يعمل بدون استهلاك لبطارية أو مساحة هاتفك وبسرعة استجابة فورية.</p>
                </div>
            </div>
        </div>
    );
};
