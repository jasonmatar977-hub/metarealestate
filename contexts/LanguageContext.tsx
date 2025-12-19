"use client";

/**
 * Language Context Provider
 * Manages language selection and provides translations
 * Supports RTL for Arabic
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'ar' | 'zh' | 'de';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation data
const translations: Record<Locale, Record<string, string>> = {
  en: {
    'common.login': 'Login',
    'common.logout': 'Logout',
    'common.createAccount': 'Create Account',
    'common.profile': 'Profile',
    'common.editProfile': 'Edit Profile',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'navbar.about': 'About',
    'navbar.whatWeDo': 'What We Do',
    'navbar.testimonials': 'Testimonials',
    'navbar.contact': 'Contact',
    'navbar.listings': 'Listings',
    'navbar.feed': 'Feed',
    'navbar.chat': 'Chat',
    'home.title': 'META REAL ESTATE',
    'home.subtitle': 'The Future of Property Discovery',
    'home.description': 'Discover properties, gain insights, and connect with opportunities through cutting-edge AI technology',
    'listings.title': 'Property Listings',
    'listings.subtitle': 'Discover your perfect property from our curated selection',
    'feed.title': 'News Feed',
    'feed.subtitle': 'Stay updated with the latest from our community',
    'feed.noPosts': 'No posts yet. Be the first to post!',
    'feed.whatsOnMind': "What's on your mind?",
    'feed.post': 'Post',
    'feed.posting': 'Posting...',
    'feed.like': 'Like',
    'feed.comment': 'Comment',
    'feed.share': 'Share',
    'feed.addComment': 'Add a comment...',
    'feed.noComments': 'No comments yet.',
    'feed.viewAll': 'View all comments',
    'feed.showLess': 'Show less',
    'feed.justNow': 'Just now',
    'profile.title': 'Profile',
    'profile.editTitle': 'Edit Profile',
    'profile.memberSince': 'Member since',
    'profile.accountInfo': 'Account Information',
    'profile.displayName': 'Display Name',
    'profile.bio': 'Bio',
    'profile.avatarUrl': 'Avatar URL',
    'profile.location': 'Location',
    'profile.phone': 'Phone',
    'profile.website': 'Website',
    'profile.saveChanges': 'Save Changes',
    'profile.saving': 'Saving...',
    'profile.profileUpdated': 'Profile updated successfully!',
    'chat.title': 'AI Chatbot',
    'chat.subtitle': 'Ask me anything about real estate',
    'chat.placeholder': 'Type your message...',
    'chat.send': 'Send',
    'navbar.messages': 'Messages',
    'messages.comingSoon': 'Messages feature coming soon!',
    'messages.description': 'Stay tuned for direct messaging functionality.',
    'auth.forgotPassword': 'Forgot password?',
    'auth.resetPassword': 'Reset Password',
    'auth.resetPasswordDescription': "Enter your email address and we'll send you a link to reset your password.",
    'auth.sendResetLink': 'Send Reset Link',
    'auth.setNewPassword': 'Set New Password',
    'auth.newPassword': 'New Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.updatePassword': 'Update Password',
    'auth.updating': 'Updating...',
    'auth.passwordUpdated': 'Password updated successfully! Redirecting to login...',
    'auth.passwordResetSent': 'Password reset email sent! Please check your inbox and follow the instructions.',
    'auth.rememberPassword': 'Remember your password?',
    'auth.backToLogin': 'Back to Login',
    'profile.posts': 'Posts',
    'profile.followers': 'Followers',
    'profile.following': 'Following',
    'profile.noPosts': 'No posts yet. Start sharing!',
    'profile.stats': 'Stats',
  },
  ar: {
    'common.login': 'تسجيل الدخول',
    'common.logout': 'تسجيل الخروج',
    'common.createAccount': 'إنشاء حساب',
    'common.profile': 'الملف الشخصي',
    'common.editProfile': 'تعديل الملف الشخصي',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'navbar.about': 'من نحن',
    'navbar.whatWeDo': 'ما نفعله',
    'navbar.testimonials': 'الشهادات',
    'navbar.contact': 'اتصل بنا',
    'navbar.listings': 'العقارات',
    'navbar.feed': 'الأخبار',
    'navbar.chat': 'المحادثة',
    'home.title': 'ميتا العقارات',
    'home.subtitle': 'مستقبل اكتشاف العقارات',
    'home.description': 'اكتشف العقارات واحصل على رؤى واتصل بالفرص من خلال تقنية الذكاء الاصطناعي المتطورة',
    'listings.title': 'قائمة العقارات',
    'listings.subtitle': 'اكتشف العقار المثالي من مجموعتنا المختارة',
    'feed.title': 'الأخبار',
    'feed.subtitle': 'ابق على اطلاع بآخر الأخبار من مجتمعنا',
    'feed.noPosts': 'لا توجد منشورات بعد. كن أول من ينشر!',
    'feed.whatsOnMind': 'بم تفكر؟',
    'feed.post': 'نشر',
    'feed.posting': 'جاري النشر...',
    'feed.like': 'إعجاب',
    'feed.comment': 'تعليق',
    'feed.share': 'مشاركة',
    'profile.title': 'الملف الشخصي',
    'profile.editTitle': 'تعديل الملف الشخصي',
    'profile.memberSince': 'عضو منذ',
    'profile.accountInfo': 'معلومات الحساب',
    'profile.displayName': 'الاسم المعروض',
    'profile.bio': 'السيرة الذاتية',
    'profile.avatarUrl': 'رابط الصورة الشخصية',
    'profile.location': 'الموقع',
    'profile.phone': 'الهاتف',
    'profile.website': 'الموقع الإلكتروني',
    'profile.saveChanges': 'حفظ التغييرات',
    'profile.saving': 'جاري الحفظ...',
    'profile.profileUpdated': 'تم تحديث الملف الشخصي بنجاح!',
    'chat.title': 'مساعد الذكاء الاصطناعي',
    'chat.subtitle': 'اسألني أي شيء عن العقارات',
    'chat.placeholder': 'اكتب رسالتك...',
    'chat.send': 'إرسال',
  },
  zh: {
    'common.login': '登录',
    'common.logout': '登出',
    'common.createAccount': '创建账户',
    'common.profile': '个人资料',
    'common.editProfile': '编辑个人资料',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'navbar.about': '关于我们',
    'navbar.whatWeDo': '我们的服务',
    'navbar.testimonials': '客户评价',
    'navbar.contact': '联系我们',
    'navbar.listings': '房源',
    'navbar.feed': '动态',
    'navbar.chat': '聊天',
    'home.title': '元房地产',
    'home.subtitle': '房地产发现的未来',
    'home.description': '通过尖端人工智能技术发现房产、获得洞察并连接机会',
    'listings.title': '房源列表',
    'listings.subtitle': '从我们精心挑选的房源中发现您的完美房产',
    'feed.title': '动态',
    'feed.subtitle': '随时了解我们社区的最新动态',
    'feed.noPosts': '还没有帖子。成为第一个发帖的人！',
    'feed.whatsOnMind': '你在想什么？',
    'feed.post': '发布',
    'feed.posting': '发布中...',
    'feed.like': '点赞',
    'feed.comment': '评论',
    'feed.share': '分享',
    'profile.title': '个人资料',
    'profile.editTitle': '编辑个人资料',
    'profile.memberSince': '会员自',
    'profile.accountInfo': '账户信息',
    'profile.displayName': '显示名称',
    'profile.bio': '简介',
    'profile.avatarUrl': '头像链接',
    'profile.location': '位置',
    'profile.phone': '电话',
    'profile.website': '网站',
    'profile.saveChanges': '保存更改',
    'profile.saving': '保存中...',
    'profile.profileUpdated': '个人资料更新成功！',
    'chat.title': 'AI聊天机器人',
    'chat.subtitle': '问我任何关于房地产的问题',
    'chat.placeholder': '输入您的消息...',
    'chat.send': '发送',
  },
  de: {
    'common.login': 'Anmelden',
    'common.logout': 'Abmelden',
    'common.createAccount': 'Konto erstellen',
    'common.profile': 'Profil',
    'common.editProfile': 'Profil bearbeiten',
    'common.cancel': 'Abbrechen',
    'common.save': 'Speichern',
    'common.loading': 'Lädt...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'navbar.about': 'Über uns',
    'navbar.whatWeDo': 'Was wir tun',
    'navbar.testimonials': 'Testimonials',
    'navbar.contact': 'Kontakt',
    'navbar.listings': 'Immobilien',
    'navbar.feed': 'Feed',
    'navbar.chat': 'Chat',
    'home.title': 'META REAL ESTATE',
    'home.subtitle': 'Die Zukunft der Immobilienentdeckung',
    'home.description': 'Entdecken Sie Immobilien, gewinnen Sie Einblicke und verbinden Sie sich mit Möglichkeiten durch modernste KI-Technologie',
    'listings.title': 'Immobilienliste',
    'listings.subtitle': 'Entdecken Sie Ihre perfekte Immobilie aus unserer kuratierten Auswahl',
    'feed.title': 'News Feed',
    'feed.subtitle': 'Bleiben Sie auf dem Laufenden mit den neuesten Nachrichten aus unserer Community',
    'feed.noPosts': 'Noch keine Beiträge. Seien Sie der Erste, der postet!',
    'feed.whatsOnMind': 'Woran denkst du?',
    'feed.post': 'Posten',
    'feed.posting': 'Wird gepostet...',
    'feed.like': 'Gefällt mir',
    'feed.comment': 'Kommentar',
    'feed.share': 'Teilen',
    'profile.title': 'Profil',
    'profile.editTitle': 'Profil bearbeiten',
    'profile.memberSince': 'Mitglied seit',
    'profile.accountInfo': 'Kontoinformationen',
    'profile.displayName': 'Anzeigename',
    'profile.bio': 'Biografie',
    'profile.avatarUrl': 'Avatar-URL',
    'profile.location': 'Standort',
    'profile.phone': 'Telefon',
    'profile.website': 'Website',
    'profile.saveChanges': 'Änderungen speichern',
    'profile.saving': 'Wird gespeichert...',
    'profile.profileUpdated': 'Profil erfolgreich aktualisiert!',
    'chat.title': 'KI-Chatbot',
    'chat.subtitle': 'Fragen Sie mich alles über Immobilien',
    'chat.placeholder': 'Geben Sie Ihre Nachricht ein...',
    'chat.send': 'Senden',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locale') as Locale;
      if (saved && ['en', 'ar', 'zh', 'de'].includes(saved)) {
        setLocaleState(saved);
      }
      setMounted(true);
    }
  }, []);

  // Update document direction for RTL
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  };

  const t = (key: string): string => {
    return translations[locale][key] || key;
  };

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  if (!mounted) {
    // Return default during SSR
    return (
      <LanguageContext.Provider value={{ locale: 'en', setLocale, t: (key) => translations.en[key] || key, dir: 'ltr' }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

