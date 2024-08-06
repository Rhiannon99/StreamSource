import 'dotenv/config';
import fastify from 'fastify';
import { META } from '@consumet/extensions';
import { fetchSources } from './src/flixhq/flixhq.js';
import { VidSrcExtractor } from './src/vidsrcme/vidsrcme.js';

const app = fastify();

const port = process.env.PORT;

app.get('/', async (request, reply) => {
    return {
        intro: "Welcome to the unofficial multi-provider resolver API.",
        documentation: "Please see github repo : https://github.com/Inside4ndroid/AIO-StreamSource",
        author: "This API is developed and created by Inside4ndroid"
    };
});

app.get('/vidsrc', async (request, reply) => {
    const id = request.query.id;
    const seasonNumber = parseInt(request.query.s, 10);
    const episodeNumber = parseInt(request.query.e, 10);
    const provider = request.query.provider;
    const type = request.query.type || null;

    if (!provider) {
        return reply.status(400).send({ message: "The 'provider' query is required" });
    }

    const fetchFlixhq = async (id, seasonNumber, episodeNumber) => {
        try {
            const res = await new META.TMDB(tmdbApi).fetchMediaInfo(id, type);
            let episodeId;

            if (seasonNumber && episodeNumber) {
                const season = res.seasons.find(season => season.season === seasonNumber);
                if (!season) {
                    return reply.status(404).send({ message: 'Season not found' });
                }
                const episode = season.episodes.find(episode => episode.episode === episodeNumber);
                if (!episode) {
                    return reply.status(404).send({ message: 'Episode not found' });
                }
                episodeId = episode.id;
            } else {
                episodeId = res.episodeId;
            }
            
            const res1 = await fetchSources(episodeId, res.id).catch((err) => {
                return reply.status(404).send({ message: err });
            });
            if (res1 && res) {
                const data = {
                    res,
                    data: res1
                };

                return reply.status(200).send(data);
            } else {
                return reply.status(404).send({ message: 'Sources not found.' });
            }
        } catch (error) {
            return reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
        }
    };

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
            const res = await new META.TMDB(tmdbApi).fetchMediaInfo(id, type);

            const subtitleCallback = (subtitleFile) => {
                console.log('Subtitle:', subtitleFile);
            };
    
            const linkCallback = (extractorLink) => {
                console.log('Extractor Link:', extractorLink);
                const data1 = {
                    res
                };
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
                return reply.status(200).send([data1, response]);
            };
    
            await extractor.getUrl(url, referer, subtitleCallback, linkCallback);
        } catch (error) {
            console.error('Error extracting URL:', error);
            reply.status(500).send('Internal Server Error');
        }
    };

    if (provider === 'flixhq') {
        await fetchFlixhq(id, seasonNumber, episodeNumber);
    } else if (provider === 'vidsrcme') {
        await fetchVidsrcMe(id, type);
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
