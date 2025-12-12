window.tts = (function () {
    let audioEl;
    let cleanupEvents = null;
    let lastObjectUrl = null;

    const subtitleState = {
        container: null,
        sentences: [],
        segments: [],
        activeIndex: -1
    };

    function ensureAudio() {
        if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.preload = 'auto';
            audioEl.controls = false;
            document.body.appendChild(audioEl);
        }
        return audioEl;
    }

    function splitSentences(text) {
        if (!text) return [];
        const cleaned = text.replace(/\s+/g, ' ').trim();
        const matches = cleaned.match(/[^.!?\r\n]+[.!?]?/g);
        if (!matches) return [];
        return matches.map(t => t.trim()).filter(Boolean);
    }

    function buildTimings(sentences, duration) {
        if (!sentences.length) return [];

        const totalChars = sentences.reduce((sum, sentence) => sum + sentence.length, 0) || 1;
        const safeDuration = (isFinite(duration) && duration > 0) ? duration : Math.max(5, totalChars * 0.35);

        let cursor = 0;
        return sentences.map(sentence => {
            const portion = sentence.length / totalChars;
            const segmentDuration = Math.max(0.35, safeDuration * portion);
            const start = cursor;
            cursor += segmentDuration;
            return { start, end: cursor };
        });
    }

    function renderSubtitles(container, sentences) {
        if (!container) return;
        container.innerHTML = '';

        const fragment = document.createDocumentFragment();
        sentences.forEach((sentence, index) => {
            const span = document.createElement('span');
            span.className = 'subtitle-chunk';
            span.dataset.index = index;
            span.textContent = sentence;
            fragment.appendChild(span);
        });

        container.appendChild(fragment);
    }

    function clearHighlight() {
        if (!subtitleState.container) return;
        const active = subtitleState.container.querySelector('.subtitle-chunk.active');
        if (active) active.classList.remove('active');
        subtitleState.activeIndex = -1;
    }

    function updateHighlight(currentTime) {
        if (!subtitleState.container || !subtitleState.segments.length) return;

        const spans = subtitleState.container.querySelectorAll('.subtitle-chunk');
        if (!spans.length) return;

        const idx = subtitleState.segments.findIndex(segment => currentTime >= segment.start && currentTime <= segment.end);
        if (idx === subtitleState.activeIndex) return;

        if (subtitleState.activeIndex >= 0 && spans[subtitleState.activeIndex]) {
            spans[subtitleState.activeIndex].classList.remove('active');
        }

        if (idx >= 0 && spans[idx]) {
            spans[idx].classList.add('active');
            spans[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        subtitleState.activeIndex = idx;
    }

    function setupSubtitleSync(text, subtitleSelector, audio) {
        subtitleState.container = subtitleSelector ? document.querySelector(subtitleSelector) : null;
        subtitleState.sentences = [];
        subtitleState.segments = [];
        subtitleState.activeIndex = -1;

        if (!subtitleState.container) return;

        subtitleState.sentences = splitSentences(text);
        renderSubtitles(subtitleState.container, subtitleState.sentences);

        const applyTimings = () => {
            subtitleState.segments = buildTimings(subtitleState.sentences, audio?.duration || 0);
        };

        if (audio?.readyState >= 1) {
            applyTimings();
        }
        else if (audio) {
            audio.addEventListener('loadedmetadata', applyTimings, { once: true });
        }

        const onTimeUpdate = () => updateHighlight(audio.currentTime);
        const onEnded = () => clearHighlight();

        if (audio) {
            audio.addEventListener('timeupdate', onTimeUpdate);
            audio.addEventListener('ended', onEnded);
            cleanupEvents = () => {
                audio.removeEventListener('timeupdate', onTimeUpdate);
                audio.removeEventListener('ended', onEnded);
                cleanupEvents = null;
            };
        }
    }

    async function playBase64(apiUrl, accessToken, text, options) {
        const opts = options || {};

        try {
            stop();

            const form = new FormData();
            form.append('text', text);
            if (opts.voice) form.append('voice', opts.voice);
            if (opts.speed) form.append('speed', opts.speed);

            const resp = await fetch(`${apiUrl}/api/audio/tts`, {
                method: 'POST',
                headers: { 'AccessToken': accessToken },
                body: form
            });
            if (!resp.ok) throw new Error('TTS hívás sikertelen');

            const blob = await resp.blob(); // audio/mpeg
            const url = URL.createObjectURL(blob);

            if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
            lastObjectUrl = url;

            const audio = ensureAudio();
            audio.src = url;

            setupSubtitleSync(text, opts.subtitleSelector, audio);

            await audio.play();

        } catch (e) {
            console.error('TTS hiba:', e);
            throw e;
        }
    }

    function stop() {
        if (!audioEl) return;

        try {
            audioEl.pause();
            audioEl.currentTime = 0;
        } catch { }

        if (cleanupEvents) cleanupEvents();
        clearHighlight();

        try {
            if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
        } catch { }

        lastObjectUrl = null;
        audioEl.src = "";
    }

    return { playBase64, stop, ensureAudio };
})();
