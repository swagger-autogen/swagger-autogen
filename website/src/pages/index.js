import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { Redirect } from '@docusaurus/router';
import Head from '@docusaurus/Head';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="">
      <main>
        <>
        <Head>
          <title>Swagger Autogen</title>
          <meta name="description" content="This module performs automatic construction of Swagger documentation. It can identify the endpoints and automatically capture methods such as get, post, put, and so on. It also identifies paths, routes, middlewares, response status codes and parameters. At the end, it generates the .json file containing the Swagger format specification."></meta>
          <meta name="keywords" content="swagger-autogen, swagger, autogen, documentation, autogeneration, openapi, nodejs"></meta>
        </Head>
          <Redirect to="docs" />
          <div>
            If you are not redirected automatically, please <a href="docs">click here</a>.
          </div>
        </>
      </main>
    </Layout>
  );
}
