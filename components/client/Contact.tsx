import React from 'react'

const Contact = () => {
  return (
    <div className="max-w-7xl mx-auto lg:flex pt-20">
      <iframe
        className="lg:min-w-[450px] xl:min-w-[600px] h-80 lg:h-auto w-full lg:w-auto"
        src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1665.0809943093248!2d72.35475205284405!3d40.757938844846535!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38bced6b92db4ad7%3A0x49234e89ae2c8833!2sMEGA%20HOME!5e0!3m2!1sen!2sus!4v1707729952035!5m2!1sen!2sus"
        width="600"
        height="450"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
      <div className="bg-gradient-to-tr from-black via-black/90 to-brand text-white flex flex-col w-full gap-8 justify-center px-6 py-10 sm:p-10">
        <h3 className="font-brand uppercase text-2xl sm:text-3xl font-semibold">
          murojat uchun:
        </h3>
        <div className="sm:text-xl">
          <a href="tel:+998880039000" className="block">
            +998 88 003 0000
          </a>
          <a href="tel:+998880049000" className="block">
            +998 88 004 9000
          </a>
        </div>
        <p className="text-sm sm:text-base">
          Andijon shahar, Boburshox ko&apos;chasi, 26 uy
          <br />
          Mo&apos;ljal: Yangi bozor, &quot;ANDIJONIM&quot; Savdo markazi
          qarshisida
        </p>
      </div>
    </div>
  );
}

export default Contact