--
-- PostgreSQL database dump
--

\restrict bMRfWnrmWlgiukKhTQ33nerIHydg4UVNMvi7qmU5yTwdgWNIzt1jhuZebtZji8Q

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditAction" AS ENUM (
    'USER_LOGIN',
    'USER_LOGOUT',
    'USER_REGISTER',
    'USER_EMAIL_VERIFY',
    'USER_PASSWORD_RESET',
    'USER_2FA_ENABLE',
    'USER_2FA_DISABLE',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_SUSPEND',
    'USER_BAN',
    'SERVER_CREATE',
    'SERVER_UPDATE',
    'SERVER_DELETE',
    'SERVER_MEMBER_JOIN',
    'SERVER_MEMBER_LEAVE',
    'SERVER_MEMBER_KICK',
    'SERVER_MEMBER_BAN',
    'CHANNEL_CREATE',
    'CHANNEL_UPDATE',
    'CHANNEL_DELETE',
    'MESSAGE_SEND',
    'MESSAGE_EDIT',
    'MESSAGE_DELETE'
);


ALTER TYPE public."AuditAction" OWNER TO postgres;

--
-- Name: ChannelType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ChannelType" AS ENUM (
    'TEXT',
    'VOICE',
    'VIDEO'
);


ALTER TYPE public."ChannelType" OWNER TO postgres;

--
-- Name: FriendRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FriendRequestStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'BLOCKED'
);


ALTER TYPE public."FriendRequestStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'MODERATOR',
    'MEMBER',
    'GUEST'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'BANNED',
    'DELETED'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    action public."AuditAction" NOT NULL,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.channels (
    id text NOT NULL,
    "serverId" text NOT NULL,
    name text NOT NULL,
    description text,
    type public."ChannelType" DEFAULT 'VOICE'::public."ChannelType" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "maxUsers" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.channels OWNER TO postgres;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text,
    fingerprint text NOT NULL,
    "userAgent" text NOT NULL,
    "ipAddress" text NOT NULL,
    "isTrusted" boolean DEFAULT false NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: direct_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.direct_messages (
    id text NOT NULL,
    content text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    "fileId" text,
    "isRead" boolean DEFAULT false NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "readAt" timestamp(3) without time zone
);


ALTER TABLE public.direct_messages OWNER TO postgres;

--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_verifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    email text NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone
);


ALTER TABLE public.email_verifications OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    path text NOT NULL,
    url text NOT NULL,
    size integer NOT NULL,
    mimetype text NOT NULL,
    "uploaderId" text NOT NULL,
    "channelId" text,
    "serverId" text,
    "isImage" boolean DEFAULT false NOT NULL,
    "isVideo" boolean DEFAULT false NOT NULL,
    "thumbnailUrl" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: friends; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.friends (
    id text NOT NULL,
    "userId" text NOT NULL,
    "friendId" text NOT NULL,
    status public."FriendRequestStatus" DEFAULT 'PENDING'::public."FriendRequestStatus" NOT NULL,
    "requesterId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.friends OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "channelId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    "fileId" text,
    attachments text[],
    "isEdited" boolean DEFAULT false NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "usedAt" timestamp(3) without time zone
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- Name: server_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.server_invites (
    id text NOT NULL,
    "serverId" text NOT NULL,
    code text NOT NULL,
    "maxUses" integer,
    uses integer DEFAULT 0 NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.server_invites OWNER TO postgres;

--
-- Name: server_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.server_members (
    id text NOT NULL,
    "serverId" text NOT NULL,
    "userId" text NOT NULL,
    role public."UserRole" DEFAULT 'MEMBER'::public."UserRole" NOT NULL,
    nickname text,
    "isMuted" boolean DEFAULT false NOT NULL,
    "isDeafened" boolean DEFAULT false NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.server_members OWNER TO postgres;

--
-- Name: servers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.servers (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    "ownerId" text NOT NULL,
    "inviteCode" text NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "maxMembers" integer DEFAULT 100 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.servers OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    "deviceId" text,
    "userAgent" text,
    "ipAddress" text,
    "isValid" boolean DEFAULT true NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: two_factor_auth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.two_factor_auth (
    id text NOT NULL,
    "userId" text NOT NULL,
    secret text NOT NULL,
    "backupCodes" text[],
    "isEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastUsedAt" timestamp(3) without time zone
);


ALTER TABLE public.two_factor_auth OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    "displayName" text,
    avatar text,
    bio text,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "isOnline" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastLoginAt" timestamp(3) without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "userId", action, metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: channels; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.channels (id, "serverId", name, description, type, "position", "maxUsers", "createdAt", "updatedAt") FROM stdin;
21687fa3-356a-4ea5-b929-3db55c024cce	88455ea1-b017-4cd6-a283-75d767040400	general	\N	TEXT	0	\N	2025-11-09 09:56:22.687	2025-11-09 09:56:22.687
04c65340-9650-4080-af22-98ace7551e87	88455ea1-b017-4cd6-a283-75d767040400	voice	\N	VOICE	0	\N	2025-11-09 09:56:22.687	2025-11-09 09:56:22.687
\.


--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.devices (id, "userId", name, fingerprint, "userAgent", "ipAddress", "isTrusted", "lastUsedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: direct_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.direct_messages (id, content, "senderId", "receiverId", "fileId", "isRead", "isEdited", "isDeleted", "createdAt", "updatedAt", "editedAt", "deletedAt", "readAt") FROM stdin;
\.


--
-- Data for Name: email_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_verifications (id, "userId", token, email, "isUsed", "expiresAt", "createdAt", "usedAt") FROM stdin;
a0bac90e-68cf-4965-a052-4f3bf7066351	995fe0d5-49bb-4f29-bcc1-04af09a83179	2269c2636f365d6350c1f11310a3a790497e4c5c4544702fba6af58d6bfb6f4a	admin@asforces.com	f	2025-11-10 09:54:21.157	2025-11-09 09:54:21.159	\N
71247f51-ab71-4108-99c3-e18e875af8ff	9231ed3d-6f32-416f-8231-396d178db492	dbf927414e6c4a36616c4459dcd0f9c80027980f2f2bc56a36da94035cb97c5d	a.sntrk4125@gmail.com	f	2025-11-10 09:54:33.689	2025-11-09 09:54:33.691	\N
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files (id, filename, "originalName", path, url, size, mimetype, "uploaderId", "channelId", "serverId", "isImage", "isVideo", "thumbnailUrl", "isDeleted", "createdAt", "deletedAt") FROM stdin;
ac601124-0635-4c36-9eca-443588e72429	dfaf8fb860aa3a64c925055eddf6fd67	asforce_avatar_v2.gif	uploads/dfaf8fb860aa3a64c925055eddf6fd67	/api/upload/uploads/dfaf8fb860aa3a64c925055eddf6fd67	166206	image/gif	995fe0d5-49bb-4f29-bcc1-04af09a83179	\N	\N	t	f	/api/upload/uploads/thumb_dfaf8fb860aa3a64c925055eddf6fd67	f	2025-11-09 09:56:56.114	\N
91a14f1a-557b-4272-b368-b52478319a03	eb8a614342e8c26c9abe64659ad3ebe4	asforce_avatar_v2.gif	uploads/eb8a614342e8c26c9abe64659ad3ebe4	/api/upload/uploads/eb8a614342e8c26c9abe64659ad3ebe4	166206	image/gif	995fe0d5-49bb-4f29-bcc1-04af09a83179	\N	\N	t	f	/api/upload/uploads/thumb_eb8a614342e8c26c9abe64659ad3ebe4	f	2025-11-09 10:05:02.738	\N
55a9d760-ab31-417c-9e7c-31613242b85d	80cf8e6cb8aeb454d698e64a267f7ad3	asforce_avatar_v2.gif	uploads/80cf8e6cb8aeb454d698e64a267f7ad3	/api/upload/uploads/80cf8e6cb8aeb454d698e64a267f7ad3	166206	image/gif	995fe0d5-49bb-4f29-bcc1-04af09a83179	\N	\N	t	f	/api/upload/uploads/thumb_80cf8e6cb8aeb454d698e64a267f7ad3	f	2025-11-09 10:05:53.367	\N
25328ddc-6da4-418a-8a4e-76a097e9cd85	8bf9525ef397d4d102d63af9e034892e	asforce_avatar_v2.gif	uploads/8bf9525ef397d4d102d63af9e034892e	/api/upload/uploads/8bf9525ef397d4d102d63af9e034892e	166206	image/gif	995fe0d5-49bb-4f29-bcc1-04af09a83179	\N	\N	t	f	/api/upload/uploads/thumb_8bf9525ef397d4d102d63af9e034892e	f	2025-11-09 10:11:52.938	\N
\.


--
-- Data for Name: friends; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.friends (id, "userId", "friendId", status, "requesterId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, "channelId", "userId", content, "fileId", attachments, "isEdited", "isDeleted", "createdAt", "updatedAt", "editedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, "userId", token, "isUsed", "expiresAt", "createdAt", "usedAt") FROM stdin;
\.


--
-- Data for Name: server_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.server_invites (id, "serverId", code, "maxUses", uses, "expiresAt", "createdBy", "createdAt") FROM stdin;
58bce321-de6e-4fce-a3f8-433e98540dca	88455ea1-b017-4cd6-a283-75d767040400	TOoZZYtY	\N	0	2025-11-16 10:12:10.859	995fe0d5-49bb-4f29-bcc1-04af09a83179	2025-11-09 10:12:10.86
\.


--
-- Data for Name: server_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.server_members (id, "serverId", "userId", role, nickname, "isMuted", "isDeafened", "joinedAt") FROM stdin;
09d703d8-5ed4-461e-85e2-69ac1fae8bbb	88455ea1-b017-4cd6-a283-75d767040400	995fe0d5-49bb-4f29-bcc1-04af09a83179	OWNER	\N	f	f	2025-11-09 09:56:22.687
\.


--
-- Data for Name: servers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.servers (id, name, description, icon, "ownerId", "inviteCode", "isPublic", "maxMembers", "createdAt", "updatedAt") FROM stdin;
88455ea1-b017-4cd6-a283-75d767040400	UNREAL		\N	995fe0d5-49bb-4f29-bcc1-04af09a83179	kXSmQNJ6	f	100	2025-11-09 09:56:22.687	2025-11-09 09:56:22.687
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, "userId", token, "deviceId", "userAgent", "ipAddress", "isValid", "expiresAt", "createdAt", "lastActiveAt") FROM stdin;
735ce8fc-2614-400b-8288-2cdf33f1097b	995fe0d5-49bb-4f29-bcc1-04af09a83179	4285ab5e9722950352080c2442bacb67ad55369dbeed14a53c3a5f4f51326148	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15	172.24.0.1	t	2025-12-09 09:56:11.728	2025-11-09 09:56:11.73	2025-11-09 09:56:11.73
\.


--
-- Data for Name: two_factor_auth; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.two_factor_auth (id, "userId", secret, "backupCodes", "isEnabled", "createdAt", "updatedAt", "lastUsedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, username, password, "displayName", avatar, bio, status, "emailVerified", "twoFactorEnabled", "isOnline", "createdAt", "updatedAt", "lastLoginAt") FROM stdin;
9231ed3d-6f32-416f-8231-396d178db492	a.sntrk4125@gmail.com	Asforce	$argon2id$v=19$m=65536,t=3,p=4$l9hB2GbGqu4nHzjTkaYwvQ$jbNKHB5rNiWW3IFUdpIJ6IhnQODsYjyPp9dsgbhyH5A	Asforce	\N	\N	ACTIVE	f	f	f	2025-11-09 09:54:33.688	2025-11-09 09:54:33.688	\N
995fe0d5-49bb-4f29-bcc1-04af09a83179	admin@asforces.com	admin	$argon2id$v=19$m=65536,t=3,p=4$F7O+jaT6bHheQZNMN1YS9g$GPG5BH6lM8WyjcnbGbl8QSFMCtakh/Y1Rwv8JRAL3FY	Admin User	/api/upload/uploads/8bf9525ef397d4d102d63af9e034892e	\N	ACTIVE	f	f	f	2025-11-09 09:54:21.152	2025-11-09 10:11:53.223	2025-11-09 09:56:11.739
\.


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: channels channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT channels_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: direct_messages direct_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT direct_messages_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: friends friends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT friends_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- Name: server_invites server_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_invites
    ADD CONSTRAINT server_invites_pkey PRIMARY KEY (id);


--
-- Name: server_members server_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT server_members_pkey PRIMARY KEY (id);


--
-- Name: servers servers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT servers_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: two_factor_auth two_factor_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT two_factor_auth_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: channels_serverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "channels_serverId_idx" ON public.channels USING btree ("serverId");


--
-- Name: devices_fingerprint_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX devices_fingerprint_idx ON public.devices USING btree (fingerprint);


--
-- Name: devices_fingerprint_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX devices_fingerprint_key ON public.devices USING btree (fingerprint);


--
-- Name: devices_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "devices_userId_idx" ON public.devices USING btree ("userId");


--
-- Name: direct_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "direct_messages_createdAt_idx" ON public.direct_messages USING btree ("createdAt");


--
-- Name: direct_messages_fileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "direct_messages_fileId_idx" ON public.direct_messages USING btree ("fileId");


--
-- Name: direct_messages_receiverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "direct_messages_receiverId_idx" ON public.direct_messages USING btree ("receiverId");


--
-- Name: direct_messages_senderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "direct_messages_senderId_idx" ON public.direct_messages USING btree ("senderId");


--
-- Name: email_verifications_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_verifications_expiresAt_idx" ON public.email_verifications USING btree ("expiresAt");


--
-- Name: email_verifications_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_verifications_token_idx ON public.email_verifications USING btree (token);


--
-- Name: email_verifications_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_verifications_token_key ON public.email_verifications USING btree (token);


--
-- Name: email_verifications_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_verifications_userId_idx" ON public.email_verifications USING btree ("userId");


--
-- Name: files_channelId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "files_channelId_idx" ON public.files USING btree ("channelId");


--
-- Name: files_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "files_createdAt_idx" ON public.files USING btree ("createdAt");


--
-- Name: files_serverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "files_serverId_idx" ON public.files USING btree ("serverId");


--
-- Name: files_uploaderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "files_uploaderId_idx" ON public.files USING btree ("uploaderId");


--
-- Name: friends_friendId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "friends_friendId_idx" ON public.friends USING btree ("friendId");


--
-- Name: friends_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX friends_status_idx ON public.friends USING btree (status);


--
-- Name: friends_userId_friendId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "friends_userId_friendId_key" ON public.friends USING btree ("userId", "friendId");


--
-- Name: friends_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "friends_userId_idx" ON public.friends USING btree ("userId");


--
-- Name: messages_channelId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_channelId_idx" ON public.messages USING btree ("channelId");


--
-- Name: messages_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_createdAt_idx" ON public.messages USING btree ("createdAt");


--
-- Name: messages_fileId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_fileId_idx" ON public.messages USING btree ("fileId");


--
-- Name: messages_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "messages_userId_idx" ON public.messages USING btree ("userId");


--
-- Name: password_resets_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "password_resets_expiresAt_idx" ON public.password_resets USING btree ("expiresAt");


--
-- Name: password_resets_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_resets_token_idx ON public.password_resets USING btree (token);


--
-- Name: password_resets_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX password_resets_token_key ON public.password_resets USING btree (token);


--
-- Name: password_resets_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "password_resets_userId_idx" ON public.password_resets USING btree ("userId");


--
-- Name: server_invites_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX server_invites_code_idx ON public.server_invites USING btree (code);


--
-- Name: server_invites_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX server_invites_code_key ON public.server_invites USING btree (code);


--
-- Name: server_invites_serverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "server_invites_serverId_idx" ON public.server_invites USING btree ("serverId");


--
-- Name: server_members_serverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "server_members_serverId_idx" ON public.server_members USING btree ("serverId");


--
-- Name: server_members_serverId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "server_members_serverId_userId_key" ON public.server_members USING btree ("serverId", "userId");


--
-- Name: server_members_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "server_members_userId_idx" ON public.server_members USING btree ("userId");


--
-- Name: server_members_userId_serverId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "server_members_userId_serverId_key" ON public.server_members USING btree ("userId", "serverId");


--
-- Name: servers_inviteCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "servers_inviteCode_idx" ON public.servers USING btree ("inviteCode");


--
-- Name: servers_inviteCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "servers_inviteCode_key" ON public.servers USING btree ("inviteCode");


--
-- Name: servers_ownerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "servers_ownerId_idx" ON public.servers USING btree ("ownerId");


--
-- Name: sessions_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_expiresAt_idx" ON public.sessions USING btree ("expiresAt");


--
-- Name: sessions_token_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_token_idx ON public.sessions USING btree (token);


--
-- Name: sessions_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);


--
-- Name: sessions_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "sessions_userId_idx" ON public.sessions USING btree ("userId");


--
-- Name: two_factor_auth_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "two_factor_auth_userId_key" ON public.two_factor_auth USING btree ("userId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_status_idx ON public.users USING btree (status);


--
-- Name: users_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_username_idx ON public.users USING btree (username);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: channels channels_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.channels
    ADD CONSTRAINT "channels_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public.servers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: devices devices_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_fileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT "direct_messages_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES public.files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: direct_messages direct_messages_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT "direct_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: direct_messages direct_messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.direct_messages
    ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: email_verifications email_verifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: files files_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "files_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public.channels(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: files files_uploaderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "files_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friends friends_friendId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT "friends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: friends friends_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friends
    ADD CONSTRAINT "friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public.channels(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_fileId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES public.files(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: password_resets password_resets_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: server_invites server_invites_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_invites
    ADD CONSTRAINT "server_invites_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public.servers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: server_members server_members_serverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT "server_members_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES public.servers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: server_members server_members_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.server_members
    ADD CONSTRAINT "server_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: servers servers_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.servers
    ADD CONSTRAINT "servers_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sessions sessions_deviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES public.devices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: two_factor_auth two_factor_auth_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.two_factor_auth
    ADD CONSTRAINT "two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict bMRfWnrmWlgiukKhTQ33nerIHydg4UVNMvi7qmU5yTwdgWNIzt1jhuZebtZji8Q

