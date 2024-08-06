import dotenv from 'dotenv/config';
import fastify from 'fastify';
import { VidSrcExtractor } from './src/vidsrcme/vidsrcme.js';

const app = fastify();

const port = process.env.PORT;

app.get('/', async (request, reply) => {
    return {
        intro: "Welcome to the unofficial multi provider resolver and eporner API, currently the ONLY All-In-One solution as well as additional Eporner resolver.",
        documentation: "Please see GitHub repo: https://github.com/Inside4ndroid/AIO-StreamSource",
        author: "This API is developed and created by Inside4ndroid"
    };
});

app.get('/vidsrc', async (request, reply) => {
    const id = request.query.id;
    const provider = request.query.provider;
    const type = request.query.type || null;

    if (!provider) {
        return reply.status(400).send({ message: "The 'provider' query is required" });
    }

    const fetchVidsrcMe = async (id, type) => {
        if (!type) {
            return reply.status(400).send({ message: "The 'type' query is required" });
        }

        const extractor = new VidSrcExtractor();
        const url = `https://vidsrc.net/embed/movie?tmdb=${id}`;
        const referer = null;

        try {
            const sources = [];
            const subtitles = [];
            
            const subtitleCallback = (subtitleFile) => {
                console.log('Subtitle:', subtitleFile);
            };

            const linkCallback = (extractorLink) => {
                console.log('Extractor Link:', extractorLink);
                
                // Replace the domain part of the URL
                const updatedUrl = extractorLink.url.replace('tmstr4.cdn5velocity.com', 'tmsdrv.vidsrc.stream');
                
                sources.push({
                    url: updatedUrl,
                    quality: extractorLink.quality,
                    isM3U8: extractorLink.isM3u8
                });

                const response = {
                    data: {
                        headers: {
                            Referer: extractorLink.referer
                        },
                        sources: sources,
                        subtitles: subtitles
                    }
                };
                return reply.status(200).send(response);
            };

            await extractor.getUrl(url, referer, subtitleCallback, linkCallback);
        } catch (error) {
            console.error('Error extracting URL:', error);
            reply.status(500).send('Internal Server Error');
        }
    };

    if (provider === 'vidsrcme') {
        await fetchVidsrcMe(id, type);
    } else {
        return reply.status(400).send({ message: 'Invalid provider specified' });
    }
});

const start = async () => {
    try {
        await app.listen({ port: port });
        console.log(`AIO Streamer is listening on port http://localhost:${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
