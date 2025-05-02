--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 16.8 (Debian 16.8-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: kfa
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO kfa;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: kfa
--

COMMENT ON SCHEMA public IS '';


--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: kfa
--

CREATE TYPE public.transaction_type AS ENUM (
    'Cash In',
    'Cash Out',
    'Load'
);


ALTER TYPE public.transaction_type OWNER TO kfa;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: currentbalance; Type: TABLE; Schema: public; Owner: kfa
--

CREATE TABLE public.currentbalance (
    id integer NOT NULL,
    balance numeric DEFAULT 0.00 NOT NULL
);


ALTER TABLE public.currentbalance OWNER TO kfa;

--
-- Name: currentbalance_id_seq; Type: SEQUENCE; Schema: public; Owner: kfa
--

CREATE SEQUENCE public.currentbalance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currentbalance_id_seq OWNER TO kfa;

--
-- Name: currentbalance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kfa
--

ALTER SEQUENCE public.currentbalance_id_seq OWNED BY public.currentbalance.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: kfa
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    amount text NOT NULL,
    name text NOT NULL,
    ref text NOT NULL,
    fee text NOT NULL,
    remarks text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transactions OWNER TO kfa;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: kfa
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO kfa;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kfa
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: currentbalance id; Type: DEFAULT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.currentbalance ALTER COLUMN id SET DEFAULT nextval('public.currentbalance_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Data for Name: currentbalance; Type: TABLE DATA; Schema: public; Owner: kfa
--

COPY public.currentbalance (id, balance) FROM stdin;
1	15877.76
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: kfa
--

COPY public.transactions (id, date, "time", amount, name, ref, fee, remarks, created_at, updated_at) FROM stdin;
33	2025-04-29	00:00	5000	TITA EMILY	N/A	100	CASH OUT	2025-04-29 13:01:24.992451	2025-04-29 13:01:24.992451
34	2025-04-29	05:43	2000	RO O JO F D.	84823	40	CLAIMED	2025-04-29 13:02:13.329705	2025-04-29 13:02:13.329705
35	2025-04-29	08:30	450	MA N D.	54142	10	CLAIMED	2025-04-29 13:03:39.212107	2025-04-29 13:03:39.212107
36	2025-04-29	09:18	1015	JE N B.	94087	15	CUANA	2025-04-29 13:03:01.946745	2025-04-29 13:03:01.946745
37	2025-04-29	09:31	2000	ED L D.	93826	40	SENT	2025-04-29 13:03:21.715417	2025-04-29 13:03:21.715417
38	2025-04-29	11:40	800	RH L C.	81660	20	CLAIMED	2025-04-29 13:03:52.93264	2025-04-29 13:03:52.93264
39	2025-04-29	11:41	700	NI A A.	13947	20	CLAIMED	2025-04-29 13:04:13.135919	2025-04-29 13:04:13.135919
40	2025-04-29	12:26	101	GO+99	68908	4	CUANA - LOAD	2025-04-29 13:05:38.554391	2025-04-29 13:05:38.554391
41	2025-04-29	12:36	1000	ENRICO D.	66253	20	SENT	2025-04-29 13:05:12.953927	2025-04-29 13:05:12.953927
42	2025-04-29	12:37	150	CARISSE V.	95667	10	CLAIMED	2025-04-29 13:06:21.335481	2025-04-29 13:06:21.335481
43	2025-04-29	12:58	1000	DR V D.	53978	20	UNPAID	2025-04-29 13:05:48.30179	2025-04-29 13:07:07.668171
44	2025-04-29	13:28	61	JOYCE F.	30757	5	SENT	2025-04-29 13:10:02.662147	2025-04-29 13:10:02.662147
45	2025-04-29	13:36	200	JE Y P.	59230	10	CUANA	2025-04-29 13:09:24.151673	2025-04-29 13:09:24.151673
46	2025-04-29	13:43	400	NA E AL A T.	63133	10	CLAIMED	2025-04-29 13:10:31.701876	2025-04-29 13:10:31.701876
47	2025-04-29	13:58	100	LA I G/	45070	10	CUANA	2025-04-29 13:09:58.299987	2025-04-29 13:09:58.299987
48	2025-04-29	14:48	345	PNB	19306	10	CUANA	2025-04-29 13:10:27.529611	2025-04-29 13:10:27.529611
49	2025-04-29	15:52	822	ST N L.	44712	20	CLAIMED	2025-04-29 13:10:47.014199	2025-04-29 13:10:47.014199
50	2025-04-29	16:19	50	RI O S.	93101	5	CLAIMED	2025-04-29 13:11:10.115609	2025-04-29 13:11:10.115609
51	2025-04-29	18:14	11	AN10	21806	4	LOAD	2025-04-29 13:12:19.143701	2025-04-29 13:12:19.143701
52	2025-04-29	18:21	117	JANICE O.	94277	10	CLAIMED	2025-04-29 13:11:42.168932	2025-04-29 13:11:42.168932
53	2025-04-29	19:09	8015	MAYA	60806	0	TRANSFER	2025-04-29 13:12:59.348528	2025-04-29 13:12:59.348528
54	2025-04-29	19:13	300	RENATO F.	25986	10	SENT	2025-04-29 13:13:42.134571	2025-04-29 13:13:42.134571
55	2025-04-29	20:41	210	JO L J.	16280	10	CUANA	2025-04-29 13:13:01.317554	2025-04-29 13:13:01.317554
56	2025-04-29	14:15	300	09941384756	241F2	10	MAYA - SENT	2025-04-29 13:53:00.819769	2025-04-29 13:53:00.819769
57	2025-04-29	16:40	45	MARISSA	1B017	5	MAYA - SENT	2025-04-29 13:54:15.589909	2025-04-29 13:54:15.589909
58	2025-04-29	18:17	95	CARISSE V.	AEA7	5	MAYA - SENT	2025-04-29 13:53:44.087065	2025-04-29 13:53:44.087065
59	2025-04-29	19:04	80	KUYA JUN	B1CB5	5	MAYA - SENT	2025-04-29 13:54:05.702974	2025-04-29 13:54:05.702974
60	2025-04-29	19:33	50	KUYA JUN	C3D97	5	MAYA - SENT	2025-04-29 13:54:24.263132	2025-04-29 13:54:24.263132
\.


--
-- Name: currentbalance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.currentbalance_id_seq', 1, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: kfa
--

SELECT pg_catalog.setval('public.transactions_id_seq', 60, true);


--
-- Name: currentbalance currentbalance_pkey; Type: CONSTRAINT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.currentbalance
    ADD CONSTRAINT currentbalance_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: kfa
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: kfa
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

