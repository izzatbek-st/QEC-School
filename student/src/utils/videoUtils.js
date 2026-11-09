import DOMPurify from 'dompurify';

/**
 * Parses any video URL (YouTube, Vimeo, direct MP4/WebM/OGG, or iframe snippet)
 * and returns metadata for embedding or direct playback.
 */
export function getVideoMeta(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();
  if (!url) return null;

  // 1. If teacher pasted an iframe snippet (<iframe ... src="..."), extract src
  if (url.includes('<iframe')) {
    const srcMatch = url.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1].trim();
    }
  }

  // 2. YouTube matching (watch?v=, youtu.be/, shorts/, embed/, mobile)
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    let startSec = null;
    const timeMatch = url.match(/[?&](?:t|start)=(\d+)/i);
    if (timeMatch) {
      startSec = timeMatch[1];
    }
    const query = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      playsinline: '1'
    });
    if (startSec) query.set('start', startSec);
    return {
      type: 'youtube',
      id: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?${query.toString()}`
    };
  }

  // 3. Vimeo matching
  const vimeoMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[2]) {
    return {
      type: 'vimeo',
      id: vimeoMatch[2],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[2]}?dnt=1`
    };
  }

  // 4. Direct video file (local uploads /uploads/... or external mp4/webm/ogg)
  return {
    type: 'direct',
    embedUrl: url
  };
}

/**
 * Sanitizes rich text HTML while preserving iframes and videos embedded by teachers.
 */
export function sanitizeLessonHtml(dirtyHtml) {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml, {
    ADD_TAGS: ['iframe', 'video', 'source'],
    ADD_ATTR: [
      'allow',
      'allowfullscreen',
      'frameborder',
      'scrolling',
      'controls',
      'playsinline',
      'preload',
      'src',
      'type',
      'controlslist',
      'target',
      'class',
      'style',
      'width',
      'height'
    ]
  });
}

