import 'dotenv/config';
import fastify from 'fastify';
import { VidSrcExtractor } from './src/vidsrcme/vidsrcme.js';

const app = fastify();
const port = process.env.PORT;

app.get('/', async (request, reply) => {
    return {
        intro: "Welcome to the unofficial multi provider resolver and eporner API, currently the ONLY All-In-One solution as well as an additional Eporner resolver.",
        documentation: "Please see the GitHub repo: https://github.com/Inside4ndroid/AIO-StreamSource",
        author: "This API is developed and created by Inside4ndroid"
    };
});

app.get('/vidsrc', async (request, reply) => {
    const id = request.query.id;
    const seasonNumber = parseInt(request.query.s, 10);
    const episodeNumber = parseInt(request.query.e, 10);
    const provider = request.query.provider;
    const thumbsize = request.query.thumbsize || 'medium';
    const resolve = request.query.resolve;
    const search = request.query.search;
    const per_page = request.query.per_page || '30';
    const page = request.query.page || '1';
    const order = request.query.order || 'latest';
    const gay = request.query.gay || '0';
    const lq = request.query.gay || '1';
    const cats = request.query.cats || null;
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
                sources.push({
                    url: extractorLink.url,
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

    const fetchEporner = async (id, thumbsize, resolve, search, per_page, page, order, gay, lq) => {
        if (id) {
            const getDetails = await getVideoDetails(id, thumbsize);
            if (getDetails === null) {
                reply.status(404).send({
                    status: 404,
                    return: "Oops reached rate limit of this API"
                });
            } else {
                return reply.status(200).send([getDetails]);
            }
        }

        if (resolve) {
            const getSources = await getVideoSources(resolve);
            if (getSources === null) {
                reply.status(404).send({
                    status: 404,
                    return: "Oops reached rate limit of this API"
                });
            } else {
                return reply.status(200).send([getSources]);
            }
        }

        if (search) {
            const getResults = await getSearchResults(search, per_page, page, thumbsize, order, gay, lq);
            if (getResults === null) {
                reply.status(404).send({
                    status: 404,
                    return: "Oops reached rate limit of this API"
                });
            } else {
                return reply.status(200).send([getResults]);
            }
        }
    };

    const fetchEpornerCats = async () => {
        const getCats = await getEPORN_CATEGORIES();
        if (getCats === null) {
            reply.status(404).send({
                status: 404,
                return: "Oops reached rate limit of this API"
            });
        } else {
            console.log(getCats);
            return reply.status(200).send(getCats);
        }
    };

    if (provider === 'vidsrcme') {
        await fetchVidsrcMe(id, type);
    } else if (provider === 'eporner') {
        if (cats) {
            await fetchEpornerCats();
        } else {
            await fetchEporner(id, thumbsize, resolve, search, per_page, page, order, gay, lq);
        }
    } else {
        return reply.status(400).send({ message: 'Invalid provider specified' });
    }
});

const start = async () => {
    try {
        app.listen({ port: port });
        console.log(`AIO Streamer is listening on port http://localhost:${port}`);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
